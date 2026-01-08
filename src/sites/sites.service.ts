import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

type Role = 'system_admin' | 'customer_admin' | 'operator';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  private resolveTenantId(
    role: Role,
    userTenantId: string | null,
    requestedTenantId?: string,
  ) {
    if (role === 'system_admin') {
      return requestedTenantId;
    }
    if (!userTenantId) {
      throw new BadRequestException('User missing tenant');
    }
    return userTenantId;
  }

  async create(
    dto: CreateSiteDto,
    opts: { role: Role; tenantId: string | null },
  ) {
    const tenantId = this.resolveTenantId(
      opts.role,
      opts.tenantId,
      dto.tenantId,
    );
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    return this.prisma.site.create({
      data: {
        name: dto.name,
        type: dto.type,
        address: dto.address,
        tenantId,
      },
      include: {
        tenant: { select: { id: true, name: true } },
        meters: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async findAll(opts: {
    role: Role;
    tenantId: string | null;
    tenantIdQuery?: string;
  }) {
    const tenantId = this.resolveTenantId(
      opts.role,
      opts.tenantId,
      opts.tenantIdQuery,
    );
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }
    return this.prisma.site.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { id: true, name: true } },
        meters: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async update(
    id: string,
    dto: UpdateSiteDto,
    opts: { role: Role; tenantId: string | null },
  ) {
    const existing = await this.prisma.site.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Site not found');
    }
    const tenantId = this.resolveTenantId(opts.role, opts.tenantId);
    if (tenantId && existing.tenantId !== tenantId) {
      throw new NotFoundException('Site not in tenant');
    }
    return this.prisma.site.update({
      where: { id },
      data: dto,
      include: {
        tenant: { select: { id: true, name: true } },
        meters: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async remove(id: string, opts: { role: Role; tenantId: string | null }) {
    const existing = await this.prisma.site.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Site not found');
    }
    const tenantId = this.resolveTenantId(opts.role, opts.tenantId);
    if (tenantId && existing.tenantId !== tenantId) {
      throw new NotFoundException('Site not in tenant');
    }
    return this.prisma.site.delete({
      where: { id },
      include: { tenant: { select: { id: true, name: true } } },
    });
  }
}
