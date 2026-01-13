import { Injectable, Logger } from '@nestjs/common';
import { ExternalSystemsService } from '../../external-systems/external-systems.service';
import { PowerDataMessage } from '../types/mqtt.types';

@Injectable()
export class PowerDataHandler {
  private readonly logger = new Logger(PowerDataHandler.name);

  constructor(private externalSystemsService: ExternalSystemsService) {}

  async handle(data: PowerDataMessage): Promise<void> {
    try {
      // 1. Lookup external system by systemId
      const externalSystem = await this.externalSystemsService.findBySystemId(
        data.systemId,
      );

      if (!externalSystem) {
        this.logger.warn(
          `External system not found: ${data.systemId}. Data will not be processed.`,
        );
        return;
      }

      // 2. Validate system is active
      if (externalSystem.status !== 'ACTIVE') {
        this.logger.warn(
          `External system ${data.systemId} is not active (status: ${externalSystem.status}). Data will not be processed.`,
        );
        return;
      }

      // 3. Get siteId from external system
      const siteId = externalSystem.siteId;

      // 4. Log processing
      this.logger.log(
        `Processing power data from ${data.systemId}, Site: ${externalSystem.site.name}, Grid: ${data.gridId}, Load: ${data.gridMetrics.totalLoad.toFixed(2)}MW`,
      );

      // 5. Update last seen timestamp
      await this.externalSystemsService.updateLastSeen(data.systemId);

      // TODO: Store power grid data to database with siteId
      // This will be implemented when PowerGridData schema is created
      // For now, log the data with siteId context

      this.logger.debug(
        `Power data processed for site ${siteId}: ${JSON.stringify(data.gridMetrics)}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error processing power data from ${data.systemId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow other handlers to process
    }
  }
}

