import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReadingDto } from './dto/create-reading.dto';
import { UpdateReadingDto } from './dto/update-reading.dto';
import { QueryReadingsDto } from './dto/query-readings.dto';

type Role = 'system_admin' | 'customer_admin' | 'operator';

@Injectable()
export class ReadingsService {
  constructor(private prisma: PrismaService) {}

  private async assertMeterAccess(
    meterId: string,
    opts: { role: Role; tenantId: string | null },
  ) {
    const meter = await this.prisma.meter.findUnique({
      where: { id: meterId },
      include: { site: true },
    });
    if (!meter) {
      throw new NotFoundException('Meter not found');
    }
    if (opts.role !== 'system_admin' && meter.site.tenantId !== opts.tenantId) {
      throw new NotFoundException('Meter not in tenant');
    }
    return meter;
  }

  async create(
    dto: CreateReadingDto,
    opts: { role: Role; tenantId: string | null },
  ) {
    await this.assertMeterAccess(dto.meterId, opts);
    return this.prisma.meterReading.create({
      data: {
        meterId: dto.meterId,
        timestamp: new Date(dto.timestamp),
        value: dto.value,
      },
      include: {
        meter: {
          select: {
            id: true,
            name: true,
            site: {
              select: {
                id: true,
                name: true,
                tenant: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  async findAll(
    query: QueryReadingsDto,
    opts: { role: Role; tenantId: string | null },
  ) {
    await this.assertMeterAccess(query.meterId, opts);
    const where: any = { meterId: query.meterId };
    if (query.from || query.to) {
      where.timestamp = {};
      if (query.from) where.timestamp.gte = new Date(query.from);
      if (query.to) where.timestamp.lte = new Date(query.to);
    }
    return this.prisma.meterReading.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      include: {
        meter: {
          select: {
            id: true,
            name: true,
            site: {
              select: {
                id: true,
                name: true,
                tenant: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  private async assertReadingAccess(
    readingId: string,
    opts: { role: Role; tenantId: string | null },
  ) {
    const reading = await this.prisma.meterReading.findUnique({
      where: { id: readingId },
      include: {
        meter: {
          include: { site: true },
        },
      },
    });
    if (!reading) {
      throw new NotFoundException('Reading not found');
    }
    if (
      opts.role !== 'system_admin' &&
      reading.meter.site.tenantId !== opts.tenantId
    ) {
      throw new NotFoundException('Reading not in tenant');
    }
    return reading;
  }

  async update(
    id: string,
    dto: UpdateReadingDto,
    opts: { role: Role; tenantId: string | null },
  ) {
    await this.assertReadingAccess(id, opts);
    const updateData: any = {};
    if (dto.timestamp) {
      updateData.timestamp = new Date(dto.timestamp);
    }
    if (dto.value !== undefined) {
      updateData.value = dto.value;
    }
    return this.prisma.meterReading.update({
      where: { id },
      data: updateData,
      include: {
        meter: {
          select: {
            id: true,
            name: true,
            site: {
              select: {
                id: true,
                name: true,
                tenant: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string, opts: { role: Role; tenantId: string | null }) {
    await this.assertReadingAccess(id, opts);
    return this.prisma.meterReading.delete({
      where: { id },
    });
  }
}
