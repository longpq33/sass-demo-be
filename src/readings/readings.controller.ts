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
import { CreateReadingDto } from './dto/create-reading.dto';
import { UpdateReadingDto } from './dto/update-reading.dto';
import { QueryReadingsDto } from './dto/query-readings.dto';
import { ReadingsService } from './readings.service';

@Controller('readings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReadingsController {
  constructor(private readonly readingsService: ReadingsService) {}

  @Post()
  @Roles('system_admin', 'customer_admin', 'operator')
  create(@Body() dto: CreateReadingDto, @CurrentUser() user: JwtPayload) {
    return this.readingsService.create(dto, {
      role: user.role,
      tenantId: user.tenantId,
    });
  }

  @Get()
  findAll(@Query() query: QueryReadingsDto, @CurrentUser() user: JwtPayload) {
    return this.readingsService.findAll(query, {
      role: user.role,
      tenantId: user.tenantId,
    });
  }

  @Patch(':id')
  @Roles('system_admin', 'customer_admin', 'operator')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReadingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.readingsService.update(id, dto, {
      role: user.role,
      tenantId: user.tenantId,
    });
  }

  @Delete(':id')
  @Roles('system_admin', 'customer_admin', 'operator')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.readingsService.remove(id, {
      role: user.role,
      tenantId: user.tenantId,
    });
  }
}
