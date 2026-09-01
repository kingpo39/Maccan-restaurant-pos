import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeItemDto {
  @IsString()
  ingredientId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class CreateRecipeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  menuPrice?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  yieldQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  wasteFactor?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items?: RecipeItemDto[];
}

export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  menuPrice?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  yieldQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  wasteFactor?: number;
}

export class AddRecipeItemDto {
  @IsString()
  ingredientId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}
