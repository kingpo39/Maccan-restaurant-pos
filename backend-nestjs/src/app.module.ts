import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { IngredientsModule } from './modules/ingredients/ingredients.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    InventoryModule,
    RecipesModule,
    OrdersModule,
    AnalyticsModule,
    DashboardModule,
    IngredientsModule,
    NutritionModule,
    SuppliersModule,
    AiModule,
  ],
})
export class AppModule {}
