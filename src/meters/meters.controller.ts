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
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';
import { MetersService } from './meters.service';

@Controller('meters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('siteId') siteId?: string) {
    return this.metersService.findAllByTenant({
      role: user.role,
      tenantId: user.tenantId,
      siteId,
    });
  }

  @Post()
  @Roles('system_admin', 'customer_admin')
  create(@Body() dto: CreateMeterDto, @CurrentUser() user: JwtPayload) {
    return this.metersService.create(dto, {
      role: user.role,
      tenantId: user.tenantId,
    });
  }

  @Patch(':id')
  @Roles('system_admin', 'customer_admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMeterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.metersService.update(id, dto, {
      role: user.role,
      tenantId: user.tenantId,
    });
  }

  @Delete(':id')
  @Roles('system_admin', 'customer_admin')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.metersService.remove(id, {
      role: user.role,
      tenantId: user.tenantId,
    });
  }
}
