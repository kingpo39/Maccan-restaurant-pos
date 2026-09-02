import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecipeDto, UpdateRecipeDto, AddRecipeItemDto } from './dto/recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Cost Engine: Calculate cost per serving using CURRENT ingredient prices
   * This always reads the latest costPerUnit from the ingredient table.
   *
   * Formula:
   *   rawCost = Σ(item.quantity × item.ingredient.costPerUnit)
   *   adjustedCost = rawCost × recipe.wasteFactor
   *   costPerServing = adjustedCost / recipe.yieldQuantity
   *   foodCostPercent = (costPerServing / recipe.menuPrice) × 100
   */
  private calculateRecipeCost(recipe: any, items: any[]) {
    let rawCost = 0;
    const itemDetails = items.map((item) => {
      const lineCost = item.quantity * item.ingredient.costPerUnit;
      rawCost += lineCost;
      return {
        ingredientId: item.ingredient.id,
        ingredientName: item.ingredient.name,
        quantity: item.quantity,
        unit: item.ingredient.baseUnit,
        costPerUnit: item.ingredient.costPerUnit,
        lineCost,
      };
    });

    const adjustedCost = rawCost * recipe.wasteFactor;
    const yieldQty = recipe.yieldQuantity || 1;
    const costPerServing = adjustedCost / yieldQty;
    const foodCostPercent = recipe.menuPrice > 0
      ? (costPerServing / recipe.menuPrice) * 100
      : 0;
    const profit = recipe.menuPrice - costPerServing;

    return {
      recipeId: recipe.id,
      rawCost: Math.round(rawCost),
      wasteFactor: recipe.wasteFactor,
      adjustedCost: Math.round(adjustedCost),
      yieldQuantity: yieldQty,
      costPerServing: Math.round(costPerServing),
      menuPrice: recipe.menuPrice,
      foodCostPercent: Math.round(foodCostPercent * 10) / 10,
      profit: Math.round(profit),
      items: itemDetails,
    };
  }

  /**
   * List all recipes with live cost calculation
   */
  async findAll(organizationId: string, locationId: string, category?: string, search?: string) {
    const where: any = { organizationId, locationId, isActive: true };
    if (category) where.category = category;
    if (search) where.name = { contains: search };

    const recipes = await this.prisma.recipe.findMany({
      where,
      include: {
        items: {
          include: { ingredient: { select: { id: true, name: true, nameFa: true, baseUnit: true, costPerUnit: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return recipes.map((recipe) => ({
      ...recipe,
      costAnalysis: this.calculateRecipeCost(recipe, recipe.items),
    }));
  }

  /**
   * Get single recipe with full cost breakdown
   */
  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        items: {
          include: { ingredient: { select: { id: true, name: true, nameFa: true, baseUnit: true, costPerUnit: true } } },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    return {
      ...recipe,
      costAnalysis: this.calculateRecipeCost(recipe, recipe.items),
    };
  }

  /**
   * Create a new recipe with ingredients
   */
  async create(dto: CreateRecipeDto, organizationId: string, locationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          name: dto.name,
          description: dto.description,
          category: dto.category || 'main',
          menuPrice: dto.menuPrice || 0,
          yieldQuantity: dto.yieldQuantity || 1,
          wasteFactor: dto.wasteFactor || 1.0,
          organizationId,
          locationId,
        },
      });

      // Add recipe items if provided
      if (dto.items && dto.items.length > 0) {
        for (const item of dto.items) {
          await tx.recipeItem.create({
            data: {
              recipeId: recipe.id,
              ingredientId: item.ingredientId,
              quantity: item.quantity,
            },
          });
        }
      }

      // Fetch with items to calculate cost
      const fullRecipe = await tx.recipe.findUnique({
        where: { id: recipe.id },
        include: {
          items: {
            include: { ingredient: { select: { id: true, name: true, nameFa: true, baseUnit: true, costPerUnit: true } } },
          },
        },
      });

      return {
        ...fullRecipe,
        costAnalysis: this.calculateRecipeCost(fullRecipe, fullRecipe.items),
      };
    });
  }

  /**
   * Update recipe details
   */
  async update(id: string, dto: UpdateRecipeDto) {
    const existing = await this.prisma.recipe.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Recipe not found');

    const recipe = await this.prisma.recipe.update({
      where: { id },
      data: {
        name: dto.name || undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        category: dto.category || undefined,
        menuPrice: dto.menuPrice !== undefined ? dto.menuPrice : undefined,
        yieldQuantity: dto.yieldQuantity !== undefined ? dto.yieldQuantity : undefined,
        wasteFactor: dto.wasteFactor !== undefined ? dto.wasteFactor : undefined,
      },
      include: {
        items: {
          include: { ingredient: { select: { id: true, name: true, nameFa: true, baseUnit: true, costPerUnit: true } } },
        },
      },
    });

    return {
      ...recipe,
      costAnalysis: this.calculateRecipeCost(recipe, recipe.items),
    };
  }

  /**
   * Delete a recipe
   */
  async remove(id: string) {
    const existing = await this.prisma.recipe.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Recipe not found');

    await this.prisma.recipe.delete({ where: { id } });
    return { message: 'Recipe deleted' };
  }

  /**
   * Add an ingredient to a recipe
   */
  async addItem(recipeId: string, dto: AddRecipeItemDto) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) throw new NotFoundException('Recipe not found');

    const ingredient = await this.prisma.ingredient.findUnique({ where: { id: dto.ingredientId } });
    if (!ingredient) throw new NotFoundException('Ingredient not found');

    // Check if already exists
    const existing = await this.prisma.recipeItem.findUnique({
      where: { recipeId_ingredientId: { recipeId, ingredientId: dto.ingredientId } },
    });

    if (existing) {
      // Update quantity
      await this.prisma.recipeItem.update({
        where: { id: existing.id },
        data: { quantity: dto.quantity },
      });
    } else {
      await this.prisma.recipeItem.create({
        data: {
          recipeId,
          ingredientId: dto.ingredientId,
          quantity: dto.quantity,
        },
      });
    }

    return this.findOne(recipeId);
  }

  /**
   * Remove an ingredient from a recipe
   */
  async removeItem(recipeId: string, itemId: string) {
    await this.prisma.recipeItem.delete({
      where: { id: itemId, recipeId },
    });

    return this.findOne(recipeId);
  }
}
