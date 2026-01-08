import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Role = 'system_admin' | 'customer_admin' | 'operator';
type AlertLevel = 'info' | 'warn' | 'critical';
type Trend = 'increasing' | 'decreasing' | 'stable';

interface TrendAnalysis {
  trend: Trend;
  slope: number;
  predictedTomorrow: number;
  confidence: number;
  avgPast: number;
  stdDev: number;
}

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

    const alertsToCreate: Array<{
      siteId: string;
      message: string;
      level: AlertLevel;
    }> = [];

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
      const pastValues = pastKeys.map((k) => buckets[k]);

      if (pastValues.length === 0) {
        continue;
      }

      const avgPast =
        pastValues.reduce((acc, value) => acc + value, 0) / pastValues.length;

      // Độ lệch chuẩn để tính z-score
      const variance =
        pastValues.reduce(
          (acc, value) => acc + (value - avgPast) * (value - avgPast),
          0,
        ) / pastValues.length;
      const stdDev = Math.sqrt(variance);

      let isAnomaly = false;
      let score = 0;

      if (stdDev > 0 && pastValues.length >= 3) {
        // Z-score: hôm nay cao hơn trung bình bao nhiêu lần độ lệch chuẩn
        score = (todayValue - avgPast) / stdDev;
        isAnomaly = score >= 2; // ~95% confidence
      } else {
        // Fallback: so sánh theo phần trăm nếu dữ liệu ít
        isAnomaly = avgPast > 0 && todayValue > avgPast * 1.3;
        score = avgPast > 0 ? (todayValue - avgPast) / avgPast : 0;
      }

      if (isAnomaly && todayValue > 0) {
        const ratio = avgPast > 0 ? (todayValue / avgPast - 1) * 100 : 0;
        const level: AlertLevel =
          score >= 3 || ratio >= 80
            ? 'critical'
            : score >= 2 || ratio >= 40
              ? 'warn'
              : 'info';

        alertsToCreate.push({
          siteId: site.id,
          message: `AI cảnh báo: tiêu thụ hôm nay (${todayValue.toFixed(
            2,
          )}) cao hơn trung bình 7 ngày (${avgPast.toFixed(
            2,
          )}) khoảng ${ratio.toFixed(1)}%. Z-score ≈ ${score.toFixed(2)}.`,
          level,
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
          level: alert.level,
        },
      });
    }

    return { created: alertsToCreate.length };
  }

  /**
   * Phân tích xu hướng từ readings và dự đoán giá trị ngày mai
   */
  private analyzeTrend(readings: any[]): TrendAnalysis | null {
    if (readings.length < 7) {
      return null; // Cần ít nhất 7 ngày dữ liệu
    }

    // Nhóm readings theo ngày
    const buckets: Record<string, number> = {};
    for (const r of readings) {
      const key = new Date(r.timestamp);
      key.setHours(0, 0, 0, 0);
      const k = key.toISOString();
      buckets[k] = (buckets[k] || 0) + Number(r.value);
    }

    const sortedDates = Object.keys(buckets).sort();
    if (sortedDates.length < 7) {
      return null;
    }

    const values = sortedDates.map((date) => buckets[date]);
    const n = values.length;

    // Tính trung bình và độ lệch chuẩn
    const avg = values.reduce((acc, v) => acc + v, 0) / n;
    const variance =
      values.reduce((acc, v) => acc + (v - avg) * (v - avg), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Linear regression đơn giản để tính slope (xu hướng)
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = values[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Xác định trend
    let trend: Trend = 'stable';
    if (slope > 0.01 * avg) {
      trend = 'increasing';
    } else if (slope < -0.01 * avg) {
      trend = 'decreasing';
    }

    // Dự đoán giá trị ngày mai (ngày thứ n+1)
    const predictedTomorrow = slope * n + intercept;

    // Tính độ tin cậy dựa trên:
    // 1. Số lượng dữ liệu (càng nhiều càng tốt)
    // 2. Độ ổn định (stdDev thấp → tin cậy cao)
    // 3. Độ mạnh của trend (slope lớn → trend rõ ràng)
    const dataQuality = Math.min(n / 14, 1); // Tối đa khi có >= 14 ngày
    const stability = stdDev > 0 ? Math.max(0, 1 - stdDev / avg) : 1; // Càng ổn định càng tốt
    const trendStrength = Math.min(Math.abs(slope) / avg, 1); // Trend càng rõ càng tốt

    const confidence =
      (dataQuality * 0.4 + stability * 0.3 + trendStrength * 0.3) * 100;

    return {
      trend,
      slope,
      predictedTomorrow: Math.max(0, predictedTomorrow), // Đảm bảo không âm
      confidence: Math.min(100, Math.max(0, confidence)),
      avgPast: avg,
      stdDev,
    };
  }

  /**
   * Tạo cảnh báo sớm dựa trên phân tích trend
   */
  async generatePredictiveAlerts(opts: {
    role: Role;
    tenantId: string | null;
  }): Promise<{
    created: number;
    totalSites: number;
    processedSites: number;
    sitesWithInsufficientData: number;
    sitesWithAlerts: number;
  }> {
    const tenantId =
      opts.role === 'system_admin' ? undefined : opts.tenantId;
    if (!tenantId && opts.role !== 'system_admin') {
      throw new NotFoundException('Tenant missing');
    }

    // Lấy tất cả sites (không giới hạn)
    const sites = await this.prisma.site.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: 'desc' },
    });

    const totalSites = sites.length;
    let processedSites = 0;
    let sitesWithInsufficientData = 0;
    let sitesWithAlerts = 0;

    // Lấy readings 30 ngày gần nhất để phân tích trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2); // Hết hạn sau 2 ngày

    const alertsToCreate: Array<{
      siteId: string;
      message: string;
      level: AlertLevel;
      predictedDate: Date;
      confidence: number;
      trend: string;
      expectedValue: number;
      expiresAt: Date;
    }> = [];

    // Xử lý từng site để tính toán cảnh báo sớm
    for (const site of sites) {
      processedSites++;

      // Lấy tất cả readings của site trong 30 ngày gần nhất
      const readings = await this.prisma.meterReading.findMany({
        where: {
          meter: { siteId: site.id },
          timestamp: { gte: thirtyDaysAgo },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Kiểm tra đủ dữ liệu (cần ít nhất 7 ngày)
      if (readings.length < 7) {
        sitesWithInsufficientData++;
        continue; // Không đủ dữ liệu, bỏ qua site này
      }

      // Phân tích trend
      const analysis = this.analyzeTrend(readings);
      if (!analysis) {
        sitesWithInsufficientData++;
        continue; // Không thể phân tích, bỏ qua
      }

      // Quyết định cảnh báo dựa trên dự đoán
      const ratio =
        analysis.avgPast > 0
          ? (analysis.predictedTomorrow / analysis.avgPast - 1) * 100
          : 0;

      // Chỉ cảnh báo nếu dự đoán cao hơn trung bình và có độ tin cậy đủ
      if (
        analysis.predictedTomorrow > analysis.avgPast * 1.2 &&
        analysis.confidence >= 50
      ) {
        sitesWithAlerts++;

        const level: AlertLevel =
          analysis.predictedTomorrow > analysis.avgPast * 1.5 &&
          analysis.confidence >= 80
            ? 'critical'
            : analysis.predictedTomorrow > analysis.avgPast * 1.3 &&
                analysis.confidence >= 60
              ? 'warn'
              : 'info';

        const trendText =
          analysis.trend === 'increasing'
            ? 'tăng'
            : analysis.trend === 'decreasing'
              ? 'giảm'
              : 'ổn định';

        alertsToCreate.push({
          siteId: site.id,
          message: `Cảnh báo sớm: Dự đoán tiêu thụ ngày mai (${analysis.predictedTomorrow.toFixed(
            2,
          )}) sẽ cao hơn trung bình (${analysis.avgPast.toFixed(
            2,
          )}) khoảng ${ratio.toFixed(1)}%. Xu hướng: ${trendText}. Độ tin cậy: ${analysis.confidence.toFixed(1)}%.`,
          level,
          predictedDate: tomorrow,
          confidence: analysis.confidence,
          trend: analysis.trend,
          expectedValue: analysis.predictedTomorrow,
          expiresAt,
        });
      }
    }

    // Xóa alerts cũ: xóa tất cả alerts của các sites này và alerts hết hạn
    // Để tránh trùng lặp khi gọi lại API
    if (tenantId) {
      const siteIds = sites.map((s) => s.id);
      await this.prisma.predictiveAlert.deleteMany({
        where: {
          OR: [
            { siteId: { in: siteIds } }, // Xóa tất cả alerts của các sites này
            { expiresAt: { lt: new Date() } }, // Xóa alerts hết hạn
          ],
        },
      });
    } else {
      // System admin: xóa tất cả alerts hết hạn hoặc có predictedDate trong tương lai gần
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      await this.prisma.predictiveAlert.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { predictedDate: { lte: futureDate } }, // Xóa alerts có predictedDate <= ngày mai
          ],
        },
      });
    }

    // Tạo alerts mới (sử dụng createMany với skipDuplicates hoặc check trước)
    for (const alert of alertsToCreate) {
      // Kiểm tra xem đã có alert cho siteId và predictedDate này chưa
      const existing = await this.prisma.predictiveAlert.findFirst({
        where: {
          siteId: alert.siteId,
          predictedDate: alert.predictedDate,
        },
      });

      // Chỉ tạo nếu chưa tồn tại
      if (!existing) {
        await this.prisma.predictiveAlert.create({
          data: {
            siteId: alert.siteId,
            message: alert.message,
            level: alert.level,
            predictedDate: alert.predictedDate,
            confidence: alert.confidence,
            trend: alert.trend,
            expectedValue: alert.expectedValue,
            expiresAt: alert.expiresAt,
          },
        });
      }
    }

    return {
      created: alertsToCreate.length,
      totalSites,
      processedSites,
      sitesWithInsufficientData,
      sitesWithAlerts,
    };
  }

  /**
   * Lấy danh sách cảnh báo sớm
   */
  async listPredictive(opts: {
    role: Role;
    tenantId: string | null;
  }): Promise<any[]> {
    if (opts.role !== 'system_admin' && !opts.tenantId) {
      throw new NotFoundException('Tenant missing');
    }

    return this.prisma.predictiveAlert.findMany({
      where: {
        expiresAt: { gte: new Date() }, // Chỉ lấy alerts chưa hết hạn
        ...(opts.role === 'system_admin'
          ? {}
          : {
              site: { tenantId: opts.tenantId ?? undefined },
            }),
      },
      orderBy: { predictedDate: 'asc' },
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
}
