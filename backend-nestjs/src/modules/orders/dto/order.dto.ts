import { IsString, IsArray, ValidateNested, IsNumber, IsPositive, IsOptional, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  recipeId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  tableId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(['CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'CLOSED', 'CANCELLED'])
  status: string;
}
