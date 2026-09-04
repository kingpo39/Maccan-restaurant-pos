import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIngredientDto, UpdateIngredientDto } from './dto/ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(private prisma: PrismaService) {}

  private static readonly aliases: Record<string, string> = {
    aubergine: 'eggplant', brinjal: 'eggplant', scallion: 'green onion', springonion: 'green onion',
    coriander: 'cilantro', corianderleaf: 'cilantro', yoghurt: 'yogurt', curd: 'yogurt',
    prawns: 'shrimp', prawn: 'shrimp', chickenbreastfillet: 'chicken breast', mincedbeef: 'beef mince',
    groundbeef: 'beef mince', beefmince: 'beef mince', lambshank: 'lamb', potatoes: 'potato',
    basmatirice: 'rice', pomegranatemolasses: 'pomegranate paste', pomegranatepaste: 'pomegranate paste',
    balsamic: 'balsamic vinegar', soysauce: 'soy sauce', parmesan: 'parmesan cheese', cheddar: 'cheddar cheese',
    whippingcream: 'cream', heavycream: 'cream', coffee: 'coffee beans',
  };

  normalizeName(name: string): string {
    const compact = name.toLocaleLowerCase().trim().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, '');
    return IngredientsService.aliases[compact] || name.trim().replace(/\s+/g, ' ');
  }

  async resolveMenuIngredient(name: string, organizationId: string, locationId: string) {
    const canonicalName = this.normalizeName(name);
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { organizationId_locationId_name: { organizationId, locationId, name: canonicalName } },
    });
    if (!ingredient) throw new NotFoundException(`Menu ingredient not found: ${name}`);
    return ingredient;
  }

  private mapIngredient(ingredient: any) {
    return { ...ingredient, allergens: this.parseAllergens(ingredient.allergens), supplier_name: ingredient.supplier?.name };
  }

  private parseAllergens(value: string | null | undefined): string[] {
    try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }

  async findAll(organizationId: string, locationId: string, search?: string, supplierId?: string) {
    const where: any = { organizationId, locationId, isActive: true };
    if (search) where.name = { contains: search };
    if (supplierId) where.supplierId = supplierId;
    const ingredients = await this.prisma.ingredient.findMany({ where, include: { supplier: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } });
    return ingredients.map((ingredient) => this.mapIngredient(ingredient));
  }

  async findOne(id: string, organizationId: string, locationId: string) {
    const ingredient = await this.prisma.ingredient.findFirst({ where: { id, organizationId, locationId }, include: { supplier: { select: { id: true, name: true } }, stockBalance: true, nutrition: true } });
    if (!ingredient) throw new NotFoundException('Ingredient not found');
    return this.mapIngredient(ingredient);
  }

  async create(dto: CreateIngredientDto, organizationId: string, locationId: string) {
    const name = this.normalizeName(dto.name);
    const existing = await this.prisma.ingredient.findUnique({ where: { organizationId_locationId_name: { organizationId, locationId, name } } });
    if (existing) return this.findOne(existing.id, organizationId, locationId);
    const ingredient = await this.prisma.ingredient.create({ data: { name, nameFa: dto.nameFa, baseUnit: dto.baseUnit, category: dto.category, costPerUnit: dto.costPerUnit ?? 0, wasteFactor: dto.wasteFactor ?? 0, allergens: JSON.stringify(dto.allergens ?? []), supplierId: dto.supplierId, organizationId, locationId }, include: { supplier: { select: { id: true, name: true } } } });
    return this.mapIngredient(ingredient);
  }

  async update(id: string, dto: UpdateIngredientDto, organizationId: string, locationId: string) {
    await this.findOne(id, organizationId, locationId);
    const ingredient = await this.prisma.ingredient.update({ where: { id }, data: { name: dto.name === undefined ? undefined : this.normalizeName(dto.name), nameFa: dto.nameFa, baseUnit: dto.baseUnit, category: dto.category, costPerUnit: dto.costPerUnit, wasteFactor: dto.wasteFactor, allergens: dto.allergens === undefined ? undefined : JSON.stringify(dto.allergens), supplierId: dto.supplierId }, include: { supplier: { select: { id: true, name: true } } } });
    return this.mapIngredient(ingredient);
  }

  async remove(id: string, organizationId: string, locationId: string) {
    await this.findOne(id, organizationId, locationId);
    await this.prisma.ingredient.update({ where: { id }, data: { isActive: false } });
    return { message: 'Ingredient deleted.' };
  }
}
