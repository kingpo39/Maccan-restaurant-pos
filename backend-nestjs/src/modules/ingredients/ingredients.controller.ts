import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { IngredientsService } from './ingredients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CreateIngredientDto, UpdateIngredientDto } from './dto/ingredient.dto';

@Controller('ingredients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IngredientsController {
  constructor(private ingredientsService: IngredientsService) {}

  @Get()
  @RequirePermissions('ingredients:view')
  findAll(@Request() req: any, @Query('search') search?: string, @Query('supplier_id') supplierId?: string) {
    return this.ingredientsService.findAll(req.user.organizationId, req.user.locationId, search, supplierId);
  }

  @Get(':id')
  @RequirePermissions('ingredients:view')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.ingredientsService.findOne(id, req.user.organizationId, req.user.locationId);
  }

  @Post()
  @RequirePermissions('ingredients:create')
  create(@Body() dto: CreateIngredientDto, @Request() req: any) {
    return this.ingredientsService.create(dto, req.user.organizationId, req.user.locationId);
  }

  @Put(':id')
  @RequirePermissions('ingredients:edit')
  update(@Param('id') id: string, @Body() dto: UpdateIngredientDto, @Request() req: any) {
    return this.ingredientsService.update(id, dto, req.user.organizationId, req.user.locationId);
  }

  @Delete(':id')
  @RequirePermissions('ingredients:delete')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.ingredientsService.remove(id, req.user.organizationId, req.user.locationId);
  }
}
