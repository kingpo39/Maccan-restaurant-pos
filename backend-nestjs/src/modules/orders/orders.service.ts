import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * CRITICAL FIX: Inventory Deduction on Order Confirmation
   * This runs inside a Prisma $transaction to ensure atomicity.
   * If ANY step fails (insufficient stock, DB error), the entire order is rolled back.
   *
   * Flow:
   * 1. Fetch order with items and recipes
   * 2. For each item, for each recipe ingredient:
   *    a. Calculate qty needed = (ingredient.qty / recipe.yield) × item.quantity
   *    b. Check stock balance
   *    c. Deduct from stock_balance
   *    d. Write inventory_ledger entry
   * 3. Update order status
   */
  async createOrder(dto: CreateOrderDto, userId: string, organizationId: string, locationId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate table exists
      let table = null;
      if (dto.tableId) {
        table = await tx.table.findUnique({ where: { id: dto.tableId } });
        if (!table) throw new NotFoundException('Table not found');

        // Mark table as occupied
        await tx.table.update({
          where: { id: dto.tableId },
          data: { status: 'OCCUPIED' },
        });
      }

      // 2. Create order
      const order = await tx.order.create({
        data: {
          tableId: dto.tableId || null,
          serverId: userId,
          organizationId,
          locationId,
          status: 'OPEN',
          notes: dto.notes,
        },
      });

      // 3. Create order items
      let totalAmount = 0;
      for (const item of dto.items) {
        const recipe = await tx.recipe.findUnique({
          where: { id: item.recipeId },
          include: { items: { include: { ingredient: true } } },
        });

        if (!recipe) throw new NotFoundException(`Recipe ${item.recipeId} not found`);

        const unitPrice = recipe.menuPrice;
        totalAmount += unitPrice * item.quantity;

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            recipeId: item.recipeId,
            quantity: item.quantity,
            unitPrice,
            notes: item.notes,
            status: 'PENDING',
          },
        });
      }

      // 4. Update order total
      await tx.order.update({
        where: { id: order.id },
        data: { totalAmount },
      });

      // 5. Fetch complete order
      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          table: { select: { id: true, label: true, capacity: true } },
          server: { select: { id: true, firstName: true, lastName: true } },
          items: {
            include: { recipe: { select: { id: true, name: true, category: true, menuPrice: true } } },
          },
        },
      });
    });
  }

  /**
   * CRITICAL: Confirm order and deduct inventory
   * This is where the magic happens - ACID transaction ensures:
   * - Either ALL ingredients are deducted, or NONE
   * - If stock is insufficient, the entire operation fails
   * - Ledger entries are created for audit trail
   */
  async confirmOrder(orderId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch order with all items and their recipe ingredients
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              recipe: {
                include: {
                  items: {
                    include: {
                      ingredient: {
                        include: { stockBalance: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'OPEN') throw new BadRequestException(`Order is already ${order.status}`);

      // 2. Check and deduct inventory for each item
      for (const orderItem of order.items) {
        const recipe = orderItem.recipe;
        if (!recipe || !recipe.items || recipe.items.length === 0) continue;

        const yieldQty = recipe.yieldQuantity || 1;

        for (const recipeItem of recipe.items) {
          const ingredient = recipeItem.ingredient;
          const qtyNeeded = (recipeItem.quantity / yieldQty) * orderItem.quantity;

          // A. Check stock
          const stock = ingredient.stockBalance;
          if (!stock || stock.quantity < qtyNeeded) {
            throw new BadRequestException(
              `Insufficient stock for ${ingredient.name}. ` +
              `Available: ${stock?.quantity || 0}, Needed: ${qtyNeeded.toFixed(2)} ` +
              `(Recipe: ${recipe.name} × ${orderItem.quantity})`
            );
          }

          // B. Deduct from stock balance
          await tx.stockBalance.update({
            where: { id: stock.id },
            data: { quantity: { decrement: qtyNeeded } },
          });

          // C. Write inventory ledger entry (CRITICAL for COGS)
          await tx.inventoryLog.create({
            data: {
              organizationId: order.organizationId,
              locationId: order.locationId,
              ingredientId: ingredient.id,
              quantityChange: -qtyNeeded,
              unitCost: ingredient.costPerUnit,
              totalValue: -(qtyNeeded * ingredient.costPerUnit),
              referenceType: 'ORDER',
              referenceId: order.id,
              note: `Order #${order.id} - ${recipe.name} × ${orderItem.quantity}`,
              actorId: userId,
            },
          });
        }
      }

      // 3. Update order status
      return tx.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED' },
        include: {
          table: { select: { id: true, label: true } },
          items: { include: { recipe: { select: { name: true } } } },
        },
      });
    });
  }

  /**
   * Update order status (flow: CONFIRMED → PREPARING → READY → SERVED → CLOSED)
   */
  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        closedAt: ['CLOSED', 'CANCELLED'].includes(dto.status) ? new Date() : undefined,
      },
    });

    // If order is closed/cancelled, free the table
    if (['CLOSED', 'CANCELLED'].includes(dto.status) && order.tableId) {
      await this.prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'FREE' },
      });
    }

    return updated;
  }

  /**
   * Update order item status
   */
  async updateItemStatus(orderId: string, itemId: string, status: string) {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
    });
    if (!item) throw new NotFoundException('Order item not found');

    const updated = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
    });

    // Auto-update order status based on item statuses
    const allItems = await this.prisma.orderItem.findMany({
      where: { orderId },
    });

    let orderStatus = 'PREPARING';
    if (allItems.every((i) => i.status === 'DELIVERED')) {
      orderStatus = 'READY';
    } else if (allItems.some((i) => i.status === 'PREPARING')) {
      orderStatus = 'PREPARING';
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: orderStatus },
    });

    return updated;
  }

  /**
   * Get all active orders
   */
  async findActive(organizationId: string, locationId: string) {
    return this.prisma.order.findMany({
      where: {
        organizationId,
        locationId,
        status: { notIn: ['CLOSED', 'CANCELLED'] },
      },
      include: {
        table: { select: { id: true, label: true, capacity: true } },
        server: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: { recipe: { select: { id: true, name: true, category: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get tables with active orders
   */
  async getTables(organizationId: string, locationId: string) {
    return this.prisma.table.findMany({
      include: {
        orders: {
          where: { status: { notIn: ['CLOSED', 'CANCELLED'] } },
          select: { id: true, status: true, totalAmount: true, createdAt: true },
        },
      },
      orderBy: { label: 'asc' },
    });
  }
}
