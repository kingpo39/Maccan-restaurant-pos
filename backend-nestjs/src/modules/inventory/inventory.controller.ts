import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ReceiveGoodsDto, ConsumeStockDto } from './dto/inventory.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Post('receive')
  @RequirePermissions('inventory:receive')
  async receiveGoods(@Body() dto: ReceiveGoodsDto, @Request() req: any) {
    return this.inventoryService.receiveGoods(dto, req.user.id);
  }

  @Get('stock')
  @RequirePermissions('inventory:view')
  async getStockLevels(@Request() req: any) {
    return this.inventoryService.getStockLevels(
      req.user.organizationId,
      req.user.locationId,
    );
  }

  @Get('alerts')
  @RequirePermissions('inventory:view')
  async getAlerts(@Request() req: any) {
    return this.inventoryService.getAlerts(
      req.user.organizationId,
      req.user.locationId,
    );
  }

  @Get('log')
  @RequirePermissions('inventory:view')
  async getLog(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getLog(
      req.user.organizationId,
      req.user.locationId,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('consume')
  @RequirePermissions('inventory:adjust')
  async consumeStock(@Body() dto: ConsumeStockDto, @Request() req: any) {
    return this.inventoryService.consumeStock(dto, req.user.id);
  }
}
