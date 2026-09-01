import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReceiveGoodsDto, ConsumeStockDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * CRITICAL FIX: Moving Weighted Average Cost (MWA)
   * This runs inside a Prisma transaction to ensure atomicity.
   *
   * Formula:
   *   NewTotalValue = (OldQty × OldAvgCost) + (ReceivedQty × ReceivedUnitCost)
   *   NewTotalQty = OldQty + ReceivedQty
   *   NewAvgCost = NewTotalValue / NewTotalQty
   *
   * If OldQty is 0, NewAvgCost = ReceivedUnitCost
   */
  async receiveGoods(dto: ReceiveGoodsDto, userId: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of dto.items) {
        // 1. Validate ingredient exists
        const ingredient = await tx.ingredient.findUnique({
          where: { id: item.ingredientId },
          include: { stockBalance: true },
        });

        if (!ingredient) {
          throw new NotFoundException(`Ingredient ${item.ingredientId} not found`);
        }

        const oldQty = ingredient.stockBalance?.quantity || 0;
        const oldAvgCost = ingredient.costPerUnit || 0;
        const receivedQty = item.quantity;
        const receivedUnitCost = item.unitCost;

        // 2. Calculate new weighted average cost (ATOMIC)
        const newTotalValue = (oldQty * oldAvgCost) + (receivedQty * receivedUnitCost);
        const newTotalQty = oldQty + receivedQty;
        const newAvgCost = newTotalQty > 0 ? newTotalValue / newTotalQty : receivedUnitCost;

        // 3. Update ingredient cost (weighted average)
        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: { costPerUnit: Math.round(newAvgCost * 100) / 100 },
        });

        // 4. Update or create stock balance
        if (ingredient.stockBalance) {
          await tx.stockBalance.update({
            where: { id: ingredient.stockBalance.id },
            data: {
              quantity: { increment: receivedQty },
              lastReceivedAt: new Date(),
              lastCostPerUnit: receivedUnitCost,
            },
          });
        } else {
          await tx.stockBalance.create({
            data: {
              organizationId: ingredient.organizationId,
              locationId: ingredient.locationId,
              ingredientId: item.ingredientId,
              quantity: receivedQty,
              lastReceivedAt: new Date(),
              lastCostPerUnit: receivedUnitCost,
            },
          });
        }

        // 5. Write inventory ledger (CRITICAL for audit trail)
        await tx.inventoryLog.create({
          data: {
            organizationId: ingredient.organizationId,
            locationId: ingredient.locationId,
            ingredientId: item.ingredientId,
            supplierId: item.supplierId || ingredient.supplierId,
            quantityChange: receivedQty,
            unitCost: receivedUnitCost,
            totalValue: receivedQty * receivedUnitCost,
            referenceType: 'RECEIVING',
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            note: item.note || 'Goods received',
            actorId: userId,
          },
        });

        results.push({
          ingredientId: item.ingredientId,
          ingredientName: ingredient.name,
          receivedQty,
          unitCost: receivedUnitCost,
          previousAvgCost: oldAvgCost,
          newAvgCost: Math.round(newAvgCost * 100) / 100,
          newStockQty: newTotalQty,
        });
      }

      return {
        message: `${results.length} item(s) received successfully`,
        items: results,
      };
    });
  }

  /**
   * Get current stock levels for all ingredients
   */
  async getStockLevels(organizationId: string, locationId: string) {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { organizationId, locationId, isActive: true },
      include: {
        stockBalance: true,
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return ingredients.map((ing) => {
      const stock = ing.stockBalance?.quantity || 0;
      let status = 'OK';
      let statusLabel = 'موجود';

      if (stock <= 0) {
        status = 'OUT_OF_STOCK';
        statusLabel = 'تمام شده';
      }

      return {
        id: ing.id,
        name: ing.name,
        baseUnit: ing.baseUnit,
        category: ing.category,
        costPerUnit: ing.costPerUnit,
        currentStock: stock,
        reservedQty: ing.stockBalance?.reservedQty || 0,
        availableStock: stock - (ing.stockBalance?.reservedQty || 0),
        lastReceivedAt: ing.stockBalance?.lastReceivedAt,
        lastCostPerUnit: ing.stockBalance?.lastCostPerUnit,
        supplier: ing.supplier,
        status,
        statusLabel,
      };
    });
  }

  /**
   * Get inventory alerts (expired, expiring, out of stock)
   */
  async getAlerts(organizationId: string, locationId: string) {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Expired items
    const expired = await this.prisma.inventoryLog.findMany({
      where: {
        organizationId,
        locationId,
        expiryDate: { lt: today },
        quantityChange: { gt: 0 }, // Only received items
      },
      include: { ingredient: { select: { name: true, baseUnit: true } } },
      orderBy: { expiryDate: 'asc' },
    });

    // Expiring soon (within 7 days)
    const expiringSoon = await this.prisma.inventoryLog.findMany({
      where: {
        organizationId,
        locationId,
        expiryDate: { gte: today, lte: nextWeek },
        quantityChange: { gt: 0 },
      },
      include: { ingredient: { select: { name: true, baseUnit: true } } },
      orderBy: { expiryDate: 'asc' },
    });

    // Out of stock ingredients
    const outOfStock = await this.prisma.ingredient.findMany({
      where: {
        organizationId,
        locationId,
        isActive: true,
        stockBalance: { quantity: { lte: 0 } },
      },
      select: { id: true, name: true, baseUnit: true },
    });

    return {
      expired: expired.map((e) => ({
        name: e.ingredient.name,
        unit: e.ingredient.baseUnit,
        expiryDate: e.expiryDate,
        quantity: e.quantityChange,
      })),
      expiringSoon: expiringSoon.map((e) => ({
        name: e.ingredient.name,
        unit: e.ingredient.baseUnit,
        expiryDate: e.expiryDate,
        quantity: e.quantityChange,
        daysLeft: Math.ceil(
          (new Date(e.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
      outOfStock,
      summary: {
        expiredCount: expired.length,
        expiringCount: expiringSoon.length,
        outOfStockCount: outOfStock.length,
        alertLevel:
          expired.length > 0 ? 'CRITICAL' : expiringSoon.length > 0 ? 'WARNING' : 'OK',
      },
    };
  }

  /**
   * Get inventory movement history
   */
  async getLog(organizationId: string, locationId: string, limit = 50) {
    return this.prisma.inventoryLog.findMany({
      where: { organizationId, locationId },
      include: {
        ingredient: { select: { name: true, baseUnit: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Consume stock (waste/usage) - runs in transaction
   */
  async consumeStock(dto: ConsumeStockDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.findUnique({
        where: { id: dto.ingredientId },
        include: { stockBalance: true },
      });

      if (!ingredient) {
        throw new NotFoundException('Ingredient not found');
      }

      const currentStock = ingredient.stockBalance?.quantity || 0;
      if (currentStock < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${ingredient.name}. Available: ${currentStock}, Requested: ${dto.quantity}`,
        );
      }

      // Deduct stock
      await tx.stockBalance.update({
        where: { id: ingredient.stockBalance.id },
        data: { quantity: { decrement: dto.quantity } },
      });

      // Write ledger entry
      await tx.inventoryLog.create({
        data: {
          organizationId: ingredient.organizationId,
          locationId: ingredient.locationId,
          ingredientId: dto.ingredientId,
          quantityChange: -dto.quantity,
          unitCost: ingredient.costPerUnit,
          totalValue: -(dto.quantity * ingredient.costPerUnit),
          referenceType: 'WASTE',
          note: dto.note || 'Stock consumed/wasted',
          actorId: userId,
        },
      });

      return {
        message: 'Stock consumed',
        ingredient: ingredient.name,
        quantityUsed: dto.quantity,
        newStock: currentStock - dto.quantity,
      };
    });
  }
}
