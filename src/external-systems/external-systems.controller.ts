import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { ExternalSystemsService } from './external-systems.service';
import { CreateExternalSystemDto } from './dto/create-external-system.dto';
import { UpdateExternalSystemDto } from './dto/update-external-system.dto';

@Controller('external-systems')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExternalSystemsController {
  constructor(private readonly externalSystemsService: ExternalSystemsService) {}

  @Post()
  @Roles('system_admin', 'customer_admin')
  create(@Body() dto: CreateExternalSystemDto, @CurrentUser() user: JwtPayload) {
    if (!user.tenantId) {
      throw new Error('User must belong to a tenant');
    }
    return this.externalSystemsService.create(dto, user.tenantId);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('siteId') siteId?: string,
  ) {
    // system_admin can see all, others only their tenant
    const tenantId = user.role === 'system_admin' ? undefined : user.tenantId || undefined;
    return this.externalSystemsService.findAll(tenantId, siteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const tenantId = user.role === 'system_admin' ? undefined : user.tenantId || undefined;
    return this.externalSystemsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles('system_admin', 'customer_admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExternalSystemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantId = user.role === 'system_admin' ? undefined : user.tenantId || undefined;
    return this.externalSystemsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Roles('system_admin', 'customer_admin')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const tenantId = user.role === 'system_admin' ? undefined : user.tenantId || undefined;
    return this.externalSystemsService.remove(id, tenantId);
  }
}

