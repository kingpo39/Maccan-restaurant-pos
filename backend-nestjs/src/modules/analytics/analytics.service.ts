import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get dashboard overview data
   */
  async getOverview(organizationId: string, locationId: string) {
    // Ingredient count
    const ingredientCount = await this.prisma.ingredient.count({
      where: { organizationId, locationId, isActive: true },
    });

    // Recipe count
    const recipeCount = await this.prisma.recipe.count({
      where: { organizationId, locationId, isActive: true },
    });

    // Supplier count
    const supplierCount = await this.prisma.supplier.count({
      where: { organizationId, locationId, isActive: true },
    });

    // Active orders
    const activeOrderCount = await this.prisma.order.count({
      where: {
        organizationId,
        locationId,
        status: { notIn: ['CLOSED', 'CANCELLED'] },
      },
    });

    // Today's orders and revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await this.prisma.order.findMany({
      where: {
        organizationId,
        locationId,
        createdAt: { gte: today },
      },
      include: {
        items: {
          include: { recipe: true },
        },
      },
    });

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const todayOrderCount = todayOrders.length;

    // Cost analysis
    const recipes = await this.prisma.recipe.findMany({
      where: { organizationId, locationId, isActive: true },
      include: {
        items: {
          include: { ingredient: { select: { costPerUnit: true } } },
        },
      },
    });

    const costAnalysis = recipes.map((recipe) => {
      let rawCost = 0;
      recipe.items.forEach((item) => {
        rawCost += item.quantity * item.ingredient.costPerUnit;
      });
      const adjustedCost = rawCost * recipe.wasteFactor;
      const costPerServing = adjustedCost / (recipe.yieldQuantity || 1);
      const foodCostPercent = recipe.menuPrice > 0
        ? (costPerServing / recipe.menuPrice) * 100
        : 0;

      return {
        id: recipe.id,
        name: recipe.name,
        category: recipe.category,
        menuPrice: recipe.menuPrice,
        rawCost: Math.round(rawCost),
        costPerServing: Math.round(costPerServing),
        foodCostPercent: Math.round(foodCostPercent * 10) / 10,
        profit: Math.round(recipe.menuPrice - costPerServing),
      };
    });

    const avgFoodCost = costAnalysis
      .filter((r) => r.foodCostPercent > 0)
      .reduce((sum, r, _, arr) => sum + r.foodCostPercent / arr.length, 0);

    // Stock alerts
    const outOfStock = await this.prisma.ingredient.count({
      where: {
        organizationId,
        locationId,
        isActive: true,
        stockBalance: { quantity: { lte: 0 } },
      },
    });

    return {
      counts: {
        ingredients: ingredientCount,
        recipes: recipeCount,
        suppliers: supplierCount,
        activeOrders: activeOrderCount,
      },
      today: {
        revenue: Math.round(todayRevenue),
        orderCount: todayOrderCount,
      },
      costAnalysis: costAnalysis.sort((a, b) => a.foodCostPercent - b.foodCostPercent),
      avgFoodCostPercent: Math.round(avgFoodCost * 10) / 10,
      alerts: {
        outOfStock,
      },
    };
  }
}
