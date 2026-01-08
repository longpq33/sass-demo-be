import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type SeriesPoint = { date: string; value: number };
type Role = 'system_admin' | 'customer_admin' | 'operator';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private asDateKey(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

  private ensureTenant(role: Role, tenantId: string | null) {
    if (role === 'system_admin') return tenantId;
    if (!tenantId) throw new BadRequestException('Tenant required');
    return tenantId;
  }

  async tenantSummary(opts: { role: Role; tenantId: string | null }) {
    const tenantId = this.ensureTenant(opts.role, opts.tenantId);
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    const sites = await this.prisma.site.findMany({
      where: { tenantId },
      include: { meters: true },
    });
    const siteIds = sites.map((s) => s.id);
    if (siteIds.length === 0) {
      return {
        tenant: tenant || null,
        totalByDay: [],
        topSites: [],
        siteCount: 0,
        meterCount: 0,
      };
    }

    const readings = await this.prisma.meterReading.findMany({
      where: { meter: { siteId: { in: siteIds } } },
      orderBy: { timestamp: 'asc' },
    });

    const totalByDayMap: Record<string, number> = {};
    const siteTotals: Record<string, number> = {};

    readings.forEach((r) => {
      const key = this.asDateKey(r.timestamp);
      totalByDayMap[key] = (totalByDayMap[key] || 0) + Number(r.value);
      const siteId =
        sites.find((s) => s.meters.some((m) => m.id === r.meterId))?.id || '';
      if (siteId) {
        siteTotals[siteId] = (siteTotals[siteId] || 0) + Number(r.value);
      }
    });

    const totalByDay: SeriesPoint[] = Object.entries(totalByDayMap)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, value]) => ({ date, value }));

    const topSites = Object.entries(siteTotals)
      .map(([siteId, value]) => ({
        siteId,
        siteName: sites.find((s) => s.id === siteId)?.name ?? 'Unknown',
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      tenant: tenant || null,
      totalByDay,
      topSites,
      siteCount: sites.length,
      meterCount: sites.reduce((acc, s) => acc + s.meters.length, 0),
    };
  }

  async siteDetail(
    siteId: string,
    opts: { role: Role; tenantId: string | null },
  ) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      include: {
        meters: true,
        tenant: { select: { id: true, name: true } },
      },
    });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    if (opts.role !== 'system_admin' && site.tenantId !== opts.tenantId) {
      throw new NotFoundException('Site not in tenant');
    }

    const readings = await this.prisma.meterReading.findMany({
      where: { meter: { siteId } },
      orderBy: { timestamp: 'asc' },
    });

    const seriesByMeter: Record<string, SeriesPoint[]> = {};
    for (const meter of site.meters) {
      seriesByMeter[meter.id] = [];
    }

    readings.forEach((r) => {
      const key = this.asDateKey(r.timestamp);
      const list = seriesByMeter[r.meterId] || [];
      const existing = list.find((p) => p.date === key);
      if (existing) {
        existing.value += Number(r.value);
      } else {
        list.push({ date: key, value: Number(r.value) });
      }
      seriesByMeter[r.meterId] = list;
    });

    Object.values(seriesByMeter).forEach((series) =>
      series.sort((a, b) => (a.date > b.date ? 1 : -1)),
    );

    return {
      tenant: site.tenant || null,
      site: { id: site.id, name: site.name },
      meters: site.meters.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        unit: m.unit,
        series: seriesByMeter[m.id] || [],
      })),
    };
  }
}
