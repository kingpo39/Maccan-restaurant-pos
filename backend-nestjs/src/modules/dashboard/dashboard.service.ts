import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private async recipes(organizationId: string, locationId: string) {
    return this.prisma.recipe.findMany({
      where: { organizationId, locationId, isActive: true },
      include: { items: { include: { ingredient: { select: { costPerUnit: true } } } } },
    });
  }

  private mapCost(recipe: any) {
    const rawCost = recipe.items.reduce((sum: number, item: any) => sum + item.quantity * item.ingredient.costPerUnit, 0);
    const adjustedCost = rawCost * recipe.wasteFactor;
    const costPerServing = adjustedCost / (recipe.yieldQuantity || 1);
    const foodCostPercent = recipe.menuPrice > 0 ? costPerServing / recipe.menuPrice * 100 : 0;
    return {
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      menuPrice: recipe.menuPrice,
      yieldQuantity: recipe.yieldQuantity,
      wasteFactor: recipe.wasteFactor,
      rawCost: Math.round(rawCost),
      adjustedCost: Math.round(adjustedCost),
      costPerServing: Math.round(costPerServing),
      foodCostPercent: Math.round(foodCostPercent * 10) / 10,
      profit: Math.round(recipe.menuPrice - costPerServing),
      profit_per_serving: Math.round(recipe.menuPrice - costPerServing),
    };
  }

  async stats(organizationId: string, locationId: string) {
    const [ingredients, recipes, suppliers, orders, todayOrders, costAnalysis] = await Promise.all([
      this.prisma.ingredient.count({ where: { organizationId, locationId, isActive: true } }),
      this.prisma.recipe.count({ where: { organizationId, locationId, isActive: true } }),
      this.prisma.supplier.count({ where: { organizationId, locationId, isActive: true } }),
      this.prisma.order.count({ where: { organizationId, locationId } }),
      this.prisma.order.findMany({ where: { organizationId, locationId, createdAt: { gte: this.startOfToday() } }, select: { totalAmount: true } }),
      this.recipes(organizationId, locationId),
    ]);
    const costs = costAnalysis.map((recipe) => this.mapCost(recipe));
    const priced = costs.filter((row) => row.foodCostPercent > 0);
    const avg = priced.length ? priced.reduce((sum, row) => sum + row.foodCostPercent, 0) / priced.length : 0;
    const revenue = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    return {
      total_ingredients: ingredients,
      total_recipes: recipes,
      total_suppliers: suppliers,
      total_orders: orders,
      today_orders: todayOrders.length,
      avg_food_cost_percent: Math.round(avg * 10) / 10,
      counts: { ingredients, recipes, suppliers, activeOrders: await this.prisma.order.count({ where: { organizationId, locationId, status: { notIn: ['CLOSED', 'CANCELLED'] } } }) },
      today: { revenue: Math.round(revenue), orderCount: todayOrders.length },
      avgFoodCostPercent: Math.round(avg * 10) / 10,
    };
  }

  async costAnalysis(organizationId: string, locationId: string) {
    const recipes = await this.recipes(organizationId, locationId);
    return recipes.map((recipe) => this.mapCost(recipe)).sort((a, b) => b.foodCostPercent - a.foodCostPercent);
  }

  private startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
