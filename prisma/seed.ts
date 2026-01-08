import 'dotenv/config';
import * as bcrypt from 'bcrypt';
// Import PrismaClient using default import for NodeNext compatibility
import PrismaPkg from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const { PrismaClient, Prisma } = PrismaPkg as any;
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  await prisma.alert.deleteMany({});
  await prisma.meterReading.deleteMany({});
  await prisma.meter.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.user.deleteMany({
    where: { role: { not: Prisma.UserRole.system_admin } },
  });
  await prisma.tenant.deleteMany({});

  const defaultPassword = 'Admin123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const systemAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash,
      role: Prisma.UserRole.system_admin,
      tenantId: null,
    },
    create: {
      email: 'admin@example.com',
      passwordHash,
      role: Prisma.UserRole.system_admin,
      tenantId: null,
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Công ty ABC',
      status: Prisma.TenantStatus.ACTIVE,
    },
  });

  const tenantAdmin = await prisma.user.create({
    data: {
      email: 'abc-admin@example.com',
      passwordHash,
      role: Prisma.UserRole.customer_admin,
      tenantId: tenant.id,
    },
  });

  const site1 = await prisma.site.create({
    data: {
      name: 'Nhà máy 1',
      type: 'factory',
      address: 'KCN VSIP',
      tenantId: tenant.id,
    },
  });
  const site2 = await prisma.site.create({
    data: {
      name: 'Văn phòng 1',
      type: 'office',
      address: 'Q1 HCM',
      tenantId: tenant.id,
    },
  });

  const meterFactoryMain = await prisma.meter.create({
    data: {
      name: 'Điện tổng NM1',
      type: 'electric',
      unit: 'kWh',
      siteId: site1.id,
    },
  });
  const meterFactoryHvac = await prisma.meter.create({
    data: {
      name: 'Điều hòa NM1',
      type: 'electric',
      unit: 'kWh',
      siteId: site1.id,
    },
  });
  const meterOfficeMain = await prisma.meter.create({
    data: {
      name: 'Điện tổng VP1',
      type: 'electric',
      unit: 'kWh',
      siteId: site2.id,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const readingsData: Array<{
    meterId: string;
    timestamp: Date;
    value: number;
  }> = [];
  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    readingsData.push(
      {
        meterId: meterFactoryMain.id,
        timestamp: new Date(date),
        value: 120 + Math.random() * 30,
      },
      {
        meterId: meterFactoryHvac.id,
        timestamp: new Date(date),
        value: 60 + Math.random() * 15,
      },
      {
        meterId: meterOfficeMain.id,
        timestamp: new Date(date),
        value: 40 + Math.random() * 10,
      },
    );
  }

  await prisma.meterReading.createMany({ data: readingsData });

  console.log('Seed completed');
  console.log('System admin:', systemAdmin.email);
  console.log('Tenant admin:', tenantAdmin.email);
  console.log('Password:', defaultPassword);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
