import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { AlertsService } from './alerts.service';

@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.alertsService.list({
      role: user.role,
      tenantId: user.tenantId,
    });
  }

  @Post('recompute')
  @Roles('system_admin', 'customer_admin')
  recompute(@CurrentUser() user: JwtPayload) {
    return this.alertsService.recompute({
      role: user.role,
      tenantId: user.tenantId,
    });
  }
}
