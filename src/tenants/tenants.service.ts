import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto, TenantStatus } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        status: dto.status ?? TenantStatus.ACTIVE,
        users: {
          create: {
            email: dto.adminEmail,
            passwordHash,
            role: 'customer_admin',
          },
        },
      },
      include: {
        users: {
          select: { id: true, email: true, role: true, tenantId: true },
        },
      },
    });
  }

  findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { sites: true, users: true } },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, role: true } },
        sites: { select: { id: true, name: true } },
      },
    });
  }

  update(id: string, dto: UpdateTenantDto) {
    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }
}
