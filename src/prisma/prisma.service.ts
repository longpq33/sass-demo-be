import { Injectable, INestApplication, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
// Import full Prisma package and pull PrismaClient off the default export.
// This avoids named-export typing issues under Prisma 7 + NodeNext.

import PrismaPkg from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const { PrismaClient } = PrismaPkg as any;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
