import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PowerGridController } from './power-grid.controller';
import { PowerGridService } from './power-grid.service';
import { ExternalSystemsModule } from '../external-systems/external-systems.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    ExternalSystemsModule,
  ],
  controllers: [PowerGridController],
  providers: [PowerGridService],
  exports: [PowerGridService],
})
export class PowerGridModule {}

