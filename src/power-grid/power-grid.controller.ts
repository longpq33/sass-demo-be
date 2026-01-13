import { Controller, Get, Query } from '@nestjs/common';
import { PowerGridService } from './power-grid.service';

@Controller('power-grid')
export class PowerGridController {
  constructor(private readonly powerGridService: PowerGridService) {}

  @Get('state')
  async getGridState(@Query('siteId') siteId?: string) {
    return this.powerGridService.getGridState(siteId);
  }

  @Get('data')
  async getCurrentData(@Query('siteId') siteId?: string) {
    return this.powerGridService.getCurrentData(siteId);
  }

  @Get('status')
  async getStatus(@Query('tenantId') tenantId?: string) {
    return this.powerGridService.getStatus();
  }
}

