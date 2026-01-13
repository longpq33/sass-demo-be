import { Module } from '@nestjs/common';
import { ExternalSystemsService } from './external-systems.service';
import { ExternalSystemsController } from './external-systems.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExternalSystemsController],
  providers: [ExternalSystemsService],
  exports: [ExternalSystemsService],
})
export class ExternalSystemsModule {}

