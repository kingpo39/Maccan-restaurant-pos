import { Controller, Get, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { NutritionService } from './nutrition.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { UpdateNutritionDto } from './dto/nutrition.dto';

@Controller('nutrition')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NutritionController {
  constructor(private nutritionService: NutritionService) {}

  @Get()
  @RequirePermissions('nutrition:view')
  findAll(@Request() req: any) {
    return this.nutritionService.findAll(req.user.organizationId, req.user.locationId);
  }

  @Get('recipe/:recipeId')
  @RequirePermissions('nutrition:view')
  getRecipe(@Param('recipeId') recipeId: string, @Request() req: any) {
    return this.nutritionService.getRecipeNutrition(recipeId, req.user.organizationId, req.user.locationId);
  }

  @Get('allergens')
  @RequirePermissions('nutrition:view')
  allergens(@Request() req: any) {
    return this.nutritionService.allergens(req.user.organizationId, req.user.locationId);
  }

  @Put(':ingredientId')
  @RequirePermissions('nutrition:edit')
  upsert(@Param('ingredientId') ingredientId: string, @Body() dto: UpdateNutritionDto, @Request() req: any) {
    return this.nutritionService.upsert(ingredientId, dto, req.user.organizationId, req.user.locationId);
  }

  @Delete(':ingredientId')
  @RequirePermissions('nutrition:delete')
  remove(@Param('ingredientId') ingredientId: string, @Request() req: any) {
    return this.nutritionService.remove(ingredientId, req.user.organizationId, req.user.locationId);
  }
}
