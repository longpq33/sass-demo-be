import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('tenant')
  tenantSummary(
    @CurrentUser() user: JwtPayload,
    @Query('tenantId') tenantIdQuery?: string,
  ) {
    // Allow system_admin to override tenantId via query parameter
    const tenantId =
      user.role === 'system_admin' && tenantIdQuery
        ? tenantIdQuery
        : user.tenantId;
    return this.dashboardService.tenantSummary({
      role: user.role,
      tenantId,
    });
  }

  @Get('site/:id')
  siteDetail(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.dashboardService.siteDetail(id, {
      role: user.role,
      tenantId: user.tenantId,
    });
  }
}
