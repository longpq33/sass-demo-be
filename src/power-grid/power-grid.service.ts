import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PowerGrid } from './types/power-grid.types';
import { ExternalSystemsService } from '../external-systems/external-systems.service';

@Injectable()
export class PowerGridService {
  private readonly logger = new Logger(PowerGridService.name);
  private readonly digitalTaiwinUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly externalSystemsService: ExternalSystemsService,
  ) {
    this.digitalTaiwinUrl =
      this.configService.get<string>('DIGITAL_TAIWIN_URL') ||
      'http://localhost:5000';
    this.logger.log(`Digital Taiwin URL: ${this.digitalTaiwinUrl}`);
  }

  /**
   * Get power grid systems filtered by tenant
   */
  private async getSystemsByTenant(tenantId?: string) {
    const systems = await this.externalSystemsService.findAll(tenantId);
    
    // Filter for active power grid systems only
    return systems.filter(
      (s) => s.type === 'POWER_GRID' && s.status === 'ACTIVE',
    );
  }

  /**
   * Get power grid systems filtered by site
   */
  private async getSystemsBySite(siteId: string) {
    const systems = await this.externalSystemsService.findAll(undefined, siteId);
    
    // Filter for active power grid systems only
    return systems.filter(
      (s) => s.type === 'POWER_GRID' && s.status === 'ACTIVE',
    );
  }

  /**
   * Fetch grid state from a specific external system
   */
  private async fetchFromSystem(systemUrl: string): Promise<PowerGrid> {
    try {
      const url = `${systemUrl}/api/grid/state`;
      this.logger.debug(`Fetching grid state from ${url}`);

      const response = await firstValueFrom(
        this.httpService.get<PowerGrid>(url, {
          timeout: 5000,
        }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch from ${systemUrl}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get power grid state from digital-taiwin service
   * If siteId provided, filter by siteId. Otherwise, return default grid (all systems)
   */
  async getGridState(siteId?: string): Promise<PowerGrid | null> {
    try {
      // Nếu có siteId → filter theo site
      if (siteId) {
        const systems = await this.getSystemsBySite(siteId);
        
        if (systems.length === 0) {
          this.logger.warn(`No active power grid systems found for site ${siteId}`);
          return null;
        }

        // Lấy system đầu tiên
        // TODO: In future, could merge multiple systems or let user select
        const system = systems[0];
        this.logger.log(`Fetching grid for site ${siteId}, system: ${system.systemId}`);
        
        // Use metadata URL if available, otherwise fallback to default
        const systemUrl = (system.metadata as any)?.url || this.digitalTaiwinUrl;
        return await this.fetchFromSystem(systemUrl);
      }

      // Nếu không có siteId → return default grid (tất cả)
      this.logger.log('Fetching default grid state (all systems)');
      const url = `${this.digitalTaiwinUrl}/api/grid/state`;
      this.logger.debug(`Fetching default grid state from ${url}`);

      const response = await firstValueFrom(
        this.httpService.get<PowerGrid>(url, {
          timeout: 5000,
        }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch grid state: ${error.message}`,
        error.stack,
      );

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new HttpException(
          'Digital Taiwin service is unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        `Failed to fetch grid state: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get current power data from digital-taiwin service
   * Filtered by siteId only
   */
  async getCurrentData(siteId?: string) {
    try {
      let systemUrl = this.digitalTaiwinUrl;

      // If siteId provided, get system URL for that site
      if (siteId) {
        const systems = await this.getSystemsBySite(siteId);
        if (systems.length > 0) {
          const system = systems[0];
          systemUrl = (system.metadata as any)?.url || this.digitalTaiwinUrl;
          this.logger.debug(`Using system URL for site ${siteId}: ${systemUrl}`);
        } else {
          this.logger.warn(`No active power grid systems found for site ${siteId}, using default URL`);
        }
      }

      const url = `${systemUrl}/api/grid/data`;
      this.logger.debug(`Fetching current data from ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 5000,
        }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch current data: ${error.message}`,
        error.stack,
      );

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new HttpException(
          'Digital Taiwin service is unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        `Failed to fetch current data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get simulation status from digital-taiwin service
   */
  async getStatus() {
    try {
      const url = `${this.digitalTaiwinUrl}/api/grid/status`;
      this.logger.debug(`Fetching status from ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 5000,
        }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch status: ${error.message}`,
        error.stack,
      );

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new HttpException(
          'Digital Taiwin service is unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        `Failed to fetch status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

