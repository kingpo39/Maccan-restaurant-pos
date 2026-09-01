import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions('users:manage')
  async findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('users:manage')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
