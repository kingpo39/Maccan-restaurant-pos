import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateNutritionDto } from './dto/nutrition.dto';

@Injectable()
export class NutritionService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, locationId: string) {
    const rows = await this.prisma.nutrition.findMany({
      where: { ingredient: { organizationId, locationId, isActive: true } },
      include: { ingredient: { select: { id: true, name: true, baseUnit: true } } },
      orderBy: { ingredient: { name: 'asc' } },
    });
    return rows.map((row) => ({ ...row, ingredient_name: row.ingredient.name, unit: row.ingredient.baseUnit }));
  }

  async getRecipeNutrition(recipeId: string, organizationId: string, locationId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, organizationId, locationId },
      include: {
        items: {
          include: {
            ingredient: { include: { nutrition: true } },
          },
        },
      },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');

    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;
    let hasNutritionData = false;

    const items = recipe.items.map((item) => {
      const nutrition = item.ingredient.nutrition;
      if (nutrition) {
        hasNutritionData = true;
        const unit = item.ingredient.baseUnit.toLowerCase();
        const quantityInGrams = unit === 'kg' || unit === 'l'
          ? item.quantity * 1000
          : unit === 'g' ? item.quantity : item.quantity * 100;
        const factor = quantityInGrams / 100;
        totalCalories += nutrition.calories * factor;
        totalProtein += nutrition.protein * factor;
        totalFat += nutrition.fat * factor;
        totalCarbs += nutrition.carbs * factor;
      }
      return {
        name: item.ingredient.name,
        quantity: item.quantity,
        unit: item.ingredient.baseUnit,
        calories: nutrition?.calories ?? null,
        protein: nutrition?.protein ?? null,
        fat: nutrition?.fat ?? null,
        carbs: nutrition?.carbs ?? null,
      };
    });

    const yieldQuantity = recipe.yieldQuantity || 1;
    const round = (value: number) => Math.round(value * 10) / 10;
    return {
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      has_nutrition_data: hasNutritionData,
      total: {
        calories: Math.round(totalCalories), protein: round(totalProtein), fat: round(totalFat), carbs: round(totalCarbs),
      },
      per_serving: {
        calories: Math.round(totalCalories / yieldQuantity), protein: round(totalProtein / yieldQuantity),
        fat: round(totalFat / yieldQuantity), carbs: round(totalCarbs / yieldQuantity),
      },
      items,
    };
  }

  async upsert(ingredientId: string, dto: UpdateNutritionDto, organizationId: string, locationId: string) {
    const ingredient = await this.prisma.ingredient.findFirst({ where: { id: ingredientId, organizationId, locationId } });
    if (!ingredient) throw new NotFoundException('Ingredient not found');
    return this.prisma.nutrition.upsert({
      where: { ingredientId },
      create: {
        ingredientId,
        calories: dto.calories ?? 0,
        protein: dto.protein ?? 0,
        fat: dto.fat ?? 0,
        carbs: dto.carbs ?? 0,
        fiber: dto.fiber ?? 0,
        sodium: dto.sodium ?? 0,
      },
      update: {
        calories: dto.calories,
        protein: dto.protein,
        fat: dto.fat,
        carbs: dto.carbs,
        fiber: dto.fiber,
        sodium: dto.sodium,
      },
    });
  }

  async remove(ingredientId: string, organizationId: string, locationId: string) {
    const ingredient = await this.prisma.ingredient.findFirst({ where: { id: ingredientId, organizationId, locationId } });
    if (!ingredient) throw new NotFoundException('Ingredient not found');
    await this.prisma.nutrition.deleteMany({ where: { ingredientId } });
    return { message: 'Nutrition data deleted' };
  }

  async allergens(organizationId: string, locationId: string) {
    const recipes = await this.prisma.recipe.findMany({
      where: { organizationId, locationId, isActive: true },
      include: { items: { include: { ingredient: { select: { allergens: true } } } } },
      orderBy: { name: 'asc' },
    });
    return recipes.map((recipe) => {
      const allergenSet = new Set<string>();
      recipe.items.forEach((item) => {
        try {
          const values = JSON.parse(item.ingredient.allergens || '[]');
          if (Array.isArray(values)) values.forEach((value) => allergenSet.add(value));
        } catch { /* Ignore malformed legacy JSON. */ }
      });
      return { id: recipe.id, name: recipe.name, category: recipe.category, menu_price: recipe.menuPrice, allergens: [...allergenSet] };
    });
  }
}
