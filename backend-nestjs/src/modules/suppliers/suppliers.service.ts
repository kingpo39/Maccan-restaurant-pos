import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, locationId: string) {
    const suppliers = await this.prisma.supplier.findMany({
      where: { organizationId, locationId, isActive: true },
      include: { _count: { select: { ingredients: true } } },
      orderBy: { name: 'asc' },
    });
    return suppliers.map((supplier) => ({
      ...supplier,
      ingredient_count: supplier._count.ingredients,
      _count: undefined,
    }));
  }

  async findOne(id: string, organizationId: string, locationId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId, locationId },
      include: { ingredients: true },
    });
    if (!supplier) throw new NotFoundException('Supplier not found.');

    const logs = await this.prisma.inventoryLog.findMany({
      where: { supplierId: id, organizationId, locationId, unitCost: { gt: 0 } },
      include: { ingredient: { select: { id: true, name: true, baseUnit: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const trends = supplier.ingredients.map((ingredient) => {
      const prices = logs.filter((log) => log.ingredientId === ingredient.id).map((log) => log.unitCost);
      return {
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.name,
        unit: ingredient.baseUnit,
        current_cost: ingredient.costPerUnit,
        min_cost: prices.length ? Math.min(...prices) : null,
        max_cost: prices.length ? Math.max(...prices) : null,
        avg_cost: prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null,
        price_updates: prices.length,
      };
    });

    return {
      supplier: { ...supplier, ingredients: undefined },
      ingredients: supplier.ingredients,
      price_history: logs.map((log) => ({
        ...log,
        cost: log.unitCost,
        ingredient_name: log.ingredient.name,
        ingredient_unit: log.ingredient.baseUnit,
      })),
      cost_trends: trends,
    };
  }

  async create(dto: CreateSupplierDto, organizationId: string, locationId: string) {
    return this.prisma.supplier.create({
      data: {
        name: dto.name,
        nameFa: dto.nameFa,
        code: dto.code,
        contactPerson: dto.contactPerson,
        email: dto.email,
        phone: dto.phone,
        paymentTerms: dto.paymentTerms,
        organizationId,
        locationId,
      },
    });
  }

  async update(id: string, dto: UpdateSupplierDto, organizationId: string, locationId: string) {
    await this.findOne(id, organizationId, locationId);
    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        nameFa: dto.nameFa,
        code: dto.code,
        contactPerson: dto.contactPerson,
        email: dto.email,
        phone: dto.phone,
        paymentTerms: dto.paymentTerms,
      },
    });
  }

  async remove(id: string, organizationId: string, locationId: string) {
    await this.findOne(id, organizationId, locationId);
    await this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
    return { message: 'Supplier deleted.' };
  }
}
