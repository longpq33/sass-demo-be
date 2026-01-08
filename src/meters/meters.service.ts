/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';

type Role = 'system_admin' | 'customer_admin' | 'operator';

@Injectable()
export class MetersService {
  constructor(private prisma: PrismaService) {}

  private async assertSiteAccess(
    siteId: string,
    opts: { role: Role; tenantId: string | null },
  ) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    if (opts.role !== 'system_admin') {
      if (!opts.tenantId) {
        throw new BadRequestException('User missing tenant');
      }
      if (site.tenantId !== opts.tenantId) {
        throw new NotFoundException('Site not in tenant');
      }
    }
    return site;
  }

  async create(
    dto: CreateMeterDto,
    opts: { role: Role; tenantId: string | null },
  ) {
    await this.assertSiteAccess(dto.siteId, opts);
    return this.prisma.meter.create({
      data: {
        name: dto.name,
        type: dto.type,
        unit: dto.unit,
        siteId: dto.siteId,
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            tenant: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async findAllByTenant(opts: {
    role: Role;
    tenantId: string | null;
    siteId?: string;
  }) {
    if (opts.role !== 'system_admin' && !opts.tenantId) {
      throw new BadRequestException('User missing tenant');
    }
    const where: any = {};
    if (opts.siteId) {
      await this.assertSiteAccess(opts.siteId, opts);
      where.siteId = opts.siteId;
    }
    if (opts.role !== 'system_admin' && opts.tenantId) {
      where.site = { tenantId: opts.tenantId };
    }
    return this.prisma.meter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            tenant: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async update(
    id: string,
    dto: UpdateMeterDto,
    opts: { role: Role; tenantId: string | null },
  ) {
    const meter = await this.prisma.meter.findUnique({
      where: { id },
      include: { site: true },
    });
    if (!meter) {
      throw new NotFoundException('Meter not found');
    }
    if (opts.role !== 'system_admin' && meter.site.tenantId !== opts.tenantId) {
      throw new NotFoundException('Meter not in tenant');
    }
    return this.prisma.meter.update({
      where: { id },
      data: dto,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            tenant: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async remove(id: string, opts: { role: Role; tenantId: string | null }) {
    const meter = await this.prisma.meter.findUnique({
      where: { id },
      include: {
        site: {
          include: { tenant: { select: { id: true, name: true } } },
        },
      },
    });
    if (!meter) {
      throw new NotFoundException('Meter not found');
    }
    if (opts.role !== 'system_admin' && meter.site.tenantId !== opts.tenantId) {
      throw new NotFoundException('Meter not in tenant');
    }
    return this.prisma.meter.delete({
      where: { id },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            tenant: { select: { id: true, name: true } },
          },
        },
      },
    });
  }
}
