import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @RequirePermissions('orders:create')
  async createOrder(@Body() dto: CreateOrderDto, @Request() req: any) {
    return this.ordersService.createOrder(
      dto,
      req.user.id,
      req.user.organizationId,
      req.user.locationId,
    );
  }

  @Post(':id/confirm')
  @RequirePermissions('orders:create')
  async confirmOrder(@Param('id') id: string, @Request() req: any) {
    return this.ordersService.confirmOrder(id, req.user.id);
  }

  @Put(':id/status')
  @RequirePermissions('orders:create')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Put(':id/items/:itemId/status')
  @RequirePermissions('kds:manage')
  async updateItemStatus(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateItemStatus(id, itemId, status);
  }

  @Get()
  @RequirePermissions('orders:view')
  async findActive(@Request() req: any) {
    return this.ordersService.findActive(
      req.user.organizationId,
      req.user.locationId,
    );
  }

  @Get('tables')
  @RequirePermissions('orders:view')
  async getTables(@Request() req: any) {
    return this.ordersService.getTables(
      req.user.organizationId,
      req.user.locationId,
    );
  }
}
