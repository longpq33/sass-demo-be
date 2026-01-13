import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExternalSystemDto } from './dto/create-external-system.dto';
import { UpdateExternalSystemDto } from './dto/update-external-system.dto';

@Injectable()
export class ExternalSystemsService {
  private readonly logger = new Logger(ExternalSystemsService.name);
  // Cache for systemId -> ExternalSystem lookup (TTL: 5 minutes)
  private readonly cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private prisma: PrismaService) {}

  /**
   * Find external system by systemId with caching
   */
  async findBySystemId(systemId: string) {
    // Check cache first
    const cached = this.cache.get(systemId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Query database
    const system = await this.prisma.externalSystem.findUnique({
      where: { systemId },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            tenantId: true,
          },
        },
      },
    });

    // Cache result if found
    if (system) {
      this.cache.set(systemId, {
        data: system,
        expiresAt: Date.now() + this.CACHE_TTL,
      });
    }

    return system;
  }

  /**
   * Invalidate cache for a systemId
   */
  private invalidateCache(systemId: string): void {
    this.cache.delete(systemId);
  }

  /**
   * Create external system
   */
  async create(dto: CreateExternalSystemDto, tenantId: string) {
    // Verify site exists and belongs to tenant
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    if (site.tenantId !== tenantId) {
      throw new BadRequestException('Site does not belong to tenant');
    }

    // Check if systemId already exists
    const existing = await this.prisma.externalSystem.findUnique({
      where: { systemId: dto.systemId },
    });

    if (existing) {
      throw new BadRequestException(`System ID ${dto.systemId} already exists`);
    }

    const system = await this.prisma.externalSystem.create({
      data: {
        systemId: dto.systemId,
        name: dto.name,
        type: dto.type,
        siteId: dto.siteId,
        status: dto.status || 'PENDING',
        mqttUsername: dto.mqttUsername,
        metadata: dto.metadata || {},
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            tenantId: true,
          },
        },
      },
    });

    this.logger.log(`Created external system: ${dto.systemId} for site: ${dto.siteId}`);
    return system;
  }

  /**
   * Find all external systems (with tenant filtering)
   */
  async findAll(tenantId?: string, siteId?: string) {
    const where: any = {};

    if (siteId) {
      where.siteId = siteId;
    } else if (tenantId) {
      where.site = {
        tenantId,
      };
    }

    return this.prisma.externalSystem.findMany({
      where,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            tenantId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find one external system
   */
  async findOne(id: string, tenantId?: string) {
    const where: any = { id };

    if (tenantId) {
      where.site = {
        tenantId,
      };
    }

    const system = await this.prisma.externalSystem.findFirst({
      where,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            tenantId: true,
          },
        },
      },
    });

    if (!system) {
      throw new NotFoundException('External system not found');
    }

    return system;
  }

  /**
   * Update external system
   */
  async update(id: string, dto: UpdateExternalSystemDto, tenantId?: string) {
    const existing = await this.findOne(id, tenantId);

    const system = await this.prisma.externalSystem.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            tenantId: true,
          },
        },
      },
    });

    // Invalidate cache
    this.invalidateCache(existing.systemId);

    this.logger.log(`Updated external system: ${existing.systemId}`);
    return system;
  }

  /**
   * Delete external system
   */
  async remove(id: string, tenantId?: string) {
    const existing = await this.findOne(id, tenantId);

    await this.prisma.externalSystem.delete({
      where: { id },
    });

    // Invalidate cache
    this.invalidateCache(existing.systemId);

    this.logger.log(`Deleted external system: ${existing.systemId}`);
    return existing;
  }

  /**
   * Update system status
   */
  async updateStatus(
    systemId: string,
    status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING',
  ) {
    const system = await this.prisma.externalSystem.findUnique({
      where: { systemId },
    });

    if (!system) {
      this.logger.warn(`System not found for status update: ${systemId}`);
      return null;
    }

    const updated = await this.prisma.externalSystem.update({
      where: { systemId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    this.invalidateCache(systemId);

    return updated;
  }

  /**
   * Update last seen timestamp
   */
  async updateLastSeen(systemId: string): Promise<void> {
    try {
      await this.prisma.externalSystem.update({
        where: { systemId },
        data: {
          lastSeen: new Date(),
        },
      });

      // Invalidate cache to refresh lastSeen
      this.invalidateCache(systemId);
    } catch (error: any) {
      // Don't throw error if system doesn't exist (might be unregistered)
      this.logger.debug(`Failed to update lastSeen for ${systemId}: ${error.message}`);
    }
  }

  /**
   * Clear expired cache entries (call periodically)
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }
}

