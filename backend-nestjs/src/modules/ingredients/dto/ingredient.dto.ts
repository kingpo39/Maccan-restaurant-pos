import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  name: string;

  @IsString()
  baseUnit: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wasteFactor?: number;

  @IsOptional()
  @IsArray()
  allergens?: string[];

  @IsOptional()
  @IsString()
  supplierId?: string;
}

export class UpdateIngredientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  baseUnit?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wasteFactor?: number;

  @IsOptional()
  @IsArray()
  allergens?: string[];

  @IsOptional()
  @IsString()
  supplierId?: string;
}
