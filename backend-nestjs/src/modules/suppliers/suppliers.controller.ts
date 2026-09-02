import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  @RequirePermissions('suppliers:view')
  findAll(@Request() req: any) {
    return this.suppliersService.findAll(req.user.organizationId, req.user.locationId);
  }

  @Get(':id')
  @RequirePermissions('suppliers:view')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.suppliersService.findOne(id, req.user.organizationId, req.user.locationId);
  }

  @Post()
  @RequirePermissions('suppliers:manage')
  create(@Body() dto: CreateSupplierDto, @Request() req: any) {
    return this.suppliersService.create(dto, req.user.organizationId, req.user.locationId);
  }

  @Put(':id')
  @RequirePermissions('suppliers:manage')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @Request() req: any) {
    return this.suppliersService.update(id, dto, req.user.organizationId, req.user.locationId);
  }

  @Delete(':id')
  @RequirePermissions('suppliers:manage')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.suppliersService.remove(id, req.user.organizationId, req.user.locationId);
  }
}
