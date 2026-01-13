import { Injectable, Logger } from '@nestjs/common';
import { ExternalSystemsService } from '../../external-systems/external-systems.service';
import { StatusMessage } from '../types/mqtt.types';

@Injectable()
export class StatusHandler {
  private readonly logger = new Logger(StatusHandler.name);

  constructor(private externalSystemsService: ExternalSystemsService) {}

  /**
   * Map MQTT status to database status
   */
  private mapStatus(
    mqttStatus: 'ONLINE' | 'OFFLINE' | 'ERROR',
  ): 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING' {
    const statusMap: Record<string, 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING'> = {
      ONLINE: 'ACTIVE',
      OFFLINE: 'INACTIVE',
      ERROR: 'ERROR',
    };
    return statusMap[mqttStatus] || 'INACTIVE';
  }

  async handle(data: StatusMessage): Promise<void> {
    try {
      // 1. Map MQTT status to database status
      const dbStatus = this.mapStatus(data.status);

      // 2. Update system status in database
      const updated = await this.externalSystemsService.updateStatus(
        data.systemId,
        dbStatus,
      );

      if (!updated) {
        this.logger.warn(
          `External system not found for status update: ${data.systemId}`,
        );
        return;
      }

      // 3. Update last seen if status is ONLINE/ACTIVE
      if (data.status === 'ONLINE' || dbStatus === 'ACTIVE') {
        await this.externalSystemsService.updateLastSeen(data.systemId);
      }

      // 3. Log status update
      this.logger.log(`System ${data.systemId} status updated: ${data.status}`);

      if (data.message) {
        this.logger.log(`Status message: ${data.message}`);
      }

      if (data.metrics) {
        this.logger.debug(`System metrics: ${JSON.stringify(data.metrics)}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Error processing status for ${data.systemId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow other handlers to process
    }
  }
}

