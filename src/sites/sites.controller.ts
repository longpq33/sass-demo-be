import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { SitesService } from './sites.service';

@Controller('sites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.sitesService.findAll({
      role: user.role,
      tenantId: user.tenantId,
      tenantIdQuery: tenantId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sitesService.findOne(id, {
      role: user.role,
      tenantId: user.tenantId,
    });
  }

  @Post()
  @Roles('system_admin', 'customer_admin')
  create(@Body() dto: CreateSiteDto, @CurrentUser() user: JwtPayload) {
    return this.sitesService.create(dto, {
      role: user.role,
      tenantId: user.tenantId,
    });
  }

  @Patch(':id')
  @Roles('system_admin', 'customer_admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sitesService.update(id, dto, {
      role: user.role,
      tenantId: user.tenantId,
    });
  }

  @Delete(':id')
  @Roles('system_admin', 'customer_admin')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sitesService.remove(id, {
      role: user.role,
      tenantId: user.tenantId,
    });
  }
}
