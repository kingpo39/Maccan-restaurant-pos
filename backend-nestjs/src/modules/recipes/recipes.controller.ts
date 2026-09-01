import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CreateRecipeDto, UpdateRecipeDto, AddRecipeItemDto } from './dto/recipe.dto';

@Controller('recipes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecipesController {
  constructor(private recipesService: RecipesService) {}

  @Get()
  @RequirePermissions('recipes:view')
  async findAll(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.recipesService.findAll(
      req.user.organizationId,
      req.user.locationId,
      category,
      search,
    );
  }

  @Get(':id')
  @RequirePermissions('recipes:view')
  async findOne(@Param('id') id: string) {
    return this.recipesService.findOne(id);
  }

  @Post()
  @RequirePermissions('recipes:create')
  async create(@Body() dto: CreateRecipeDto, @Request() req: any) {
    return this.recipesService.create(dto, req.user.organizationId, req.user.locationId);
  }

  @Put(':id')
  @RequirePermissions('recipes:edit')
  async update(@Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.recipesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('recipes:delete')
  async remove(@Param('id') id: string) {
    return this.recipesService.remove(id);
  }

  @Post(':id/items')
  @RequirePermissions('recipes:edit')
  async addItem(@Param('id') id: string, @Body() dto: AddRecipeItemDto) {
    return this.recipesService.addItem(id, dto);
  }

  @Delete(':recipeId/items/:itemId')
  @RequirePermissions('recipes:edit')
  async removeItem(
    @Param('recipeId') recipeId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.recipesService.removeItem(recipeId, itemId);
  }
}
