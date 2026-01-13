import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { PowerDataHandler } from './handlers/power-data.handler';
import { StatusHandler } from './handlers/status.handler';
import { PrismaModule } from '../prisma/prisma.module';
import { ExternalSystemsModule } from '../external-systems/external-systems.module';

@Module({
  imports: [PrismaModule, ExternalSystemsModule],
  providers: [MqttService, PowerDataHandler, StatusHandler],
  exports: [MqttService],
})
export class MqttModule {
  constructor(
    private mqttService: MqttService,
    private powerDataHandler: PowerDataHandler,
    private statusHandler: StatusHandler,
  ) {
    // Register handlers after module initialization
    this.mqttService.onPowerData((data) => this.powerDataHandler.handle(data));
    this.mqttService.onStatus((data) => this.statusHandler.handle(data));
  }
}

