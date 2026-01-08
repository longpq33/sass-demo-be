import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Role = 'system_admin' | 'customer_admin' | 'operator';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  list(opts: { role: Role; tenantId: string | null }): Promise<any[]> {
    if (opts.role !== 'system_admin' && !opts.tenantId) {
      throw new NotFoundException('Tenant missing');
    }

    return this.prisma.alert.findMany({
      where:
        opts.role === 'system_admin'
          ? {}
          : {
              site: { tenantId: opts.tenantId ?? undefined },
            },
      orderBy: { createdAt: 'desc' },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            tenantId: true,
            tenant: { select: { id: true, name: true } },
          },
        },
      },
      take: 100,
    });
  }

  async recompute(opts: { role: Role; tenantId: string | null }) {
    const tenantId = opts.role === 'system_admin' ? undefined : opts.tenantId;
    if (!tenantId && opts.role !== 'system_admin') {
      throw new NotFoundException('Tenant missing');
    }

    const sites = await this.prisma.site.findMany({
      where: tenantId ? { tenantId } : {},
    });
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alertsToCreate: Array<{ siteId: string; message: string }> = [];

    for (const site of sites) {
      const readings = await this.prisma.meterReading.findMany({
        where: {
          meter: { siteId: site.id },
          timestamp: { gte: sevenDaysAgo },
        },
      });

      const buckets: Record<string, number> = {};
      for (const r of readings) {
        const key = new Date(r.timestamp);
        key.setHours(0, 0, 0, 0);
        const k = key.toISOString();
        buckets[k] = (buckets[k] || 0) + Number(r.value);
      }

      const todayKey = today.toISOString();
      const todayValue = buckets[todayKey] ?? 0;
      const pastKeys = Object.keys(buckets).filter((k) => k !== todayKey);
      const avgPast =
        pastKeys.length === 0
          ? 0
          : pastKeys.reduce((acc, k) => acc + buckets[k], 0) / pastKeys.length;

      if (avgPast > 0 && todayValue > avgPast * 1.2) {
        alertsToCreate.push({
          siteId: site.id,
          message: `Tiêu thụ hôm nay (${todayValue.toFixed(
            2,
          )}) cao hơn trung bình 7 ngày (${avgPast.toFixed(2)})`,
        });
      }
    }

    if (tenantId) {
      const siteIds = sites.map((s) => s.id);
      await this.prisma.alert.deleteMany({
        where: { siteId: { in: siteIds } },
      });
    } else {
      await this.prisma.alert.deleteMany({});
    }

    for (const alert of alertsToCreate) {
      await this.prisma.alert.create({
        data: {
          siteId: alert.siteId,
          message: alert.message,
        },
      });
    }

    return { created: alertsToCreate.length };
  }
}
