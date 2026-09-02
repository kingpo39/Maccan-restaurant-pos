import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @RequirePermissions('dashboard:view')
  stats(@Request() req: any) {
    return this.dashboardService.stats(req.user.organizationId, req.user.locationId);
  }

  @Get('cost-analysis')
  @RequirePermissions('dashboard:view')
  costAnalysis(@Request() req: any) {
    return this.dashboardService.costAnalysis(req.user.organizationId, req.user.locationId);
  }
}
