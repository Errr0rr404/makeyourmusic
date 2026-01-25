import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

// Load dotenv to get DATABASE_URL
import * as dotenv from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(__dirname, '../.env');
const rootEnvPath = resolve(__dirname, '../../.env');
if (require('fs').existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (require('fs').existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

// Get DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set. Please check your .env file.');
}

// Create adapter and client with proper configuration
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding ERP database...');

  // Hash password helper
  const hashPassword = (password: string) => bcrypt.hash(password, 12);

  // Create Admin user
  const adminPassword = await hashPassword('Admin123!!');
  await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
    },
  });

  // Create CFO user
  const cfoPassword = await hashPassword('Cfo123!!');
  await prisma.user.upsert({
    where: { email: 'cfo@company.com' },
    update: {},
    create: {
      email: 'cfo@company.com',
      passwordHash: cfoPassword,
      firstName: 'Chief',
      lastName: 'Financial Officer',
      role: 'CFO',
    },
  });

  // Create HR Manager user
  const hrPassword = await hashPassword('HrManager123!!');
  await prisma.user.upsert({
    where: { email: 'hr@company.com' },
    update: {},
    create: {
      email: 'hr@company.com',
      passwordHash: hrPassword,
      firstName: 'HR',
      lastName: 'Manager',
      role: 'HR_MANAGER',
    },
  });

  // Create Sales Manager user
  const salesPassword = await hashPassword('SalesManager123!!');
  await prisma.user.upsert({
    where: { email: 'sales@company.com' },
    update: {},
    create: {
      email: 'sales@company.com',
      passwordHash: salesPassword,
      firstName: 'Sales',
      lastName: 'Manager',
      role: 'SALES_MANAGER',
    },
  });

  // Create Operations Manager user
  const opsPassword = await hashPassword('OpsManager123!!');
  await prisma.user.upsert({
    where: { email: 'ops@company.com' },
    update: {},
    create: {
      email: 'ops@company.com',
      passwordHash: opsPassword,
      firstName: 'Operations',
      lastName: 'Manager',
      role: 'OPERATIONS_MANAGER',
    },
  });

  // Create Project Manager user
  const pmPassword = await hashPassword('ProjectManager123!!');
  await prisma.user.upsert({
    where: { email: 'pm@company.com' },
    update: {},
    create: {
      email: 'pm@company.com',
      passwordHash: pmPassword,
      firstName: 'Project',
      lastName: 'Manager',
      role: 'PROJECT_MANAGER',
    },
  });

  // Create Analyst user
  const analystPassword = await hashPassword('Analyst123!!');
  await prisma.user.upsert({
    where: { email: 'analyst@company.com' },
    update: {},
    create: {
      email: 'analyst@company.com',
      passwordHash: analystPassword,
      firstName: 'Business',
      lastName: 'Analyst',
      role: 'ANALYST',
    },
  });

  // Create Customer user
  const customerPassword = await hashPassword('Customer123!!');
  await prisma.user.upsert({
    where: { email: 'customer@client.com' },
    update: {},
    create: {
      email: 'customer@client.com',
      passwordHash: customerPassword,
      firstName: 'John',
      lastName: 'Customer',
      role: 'CUSTOMER',
    },
  });

  // Create Mastermind user
  const mastermindPassword = await hashPassword('Mastermind123!!');
  await prisma.user.upsert({
    where: { email: 'mastermind@kairux.ai' },
    update: {},
    create: {
      email: 'mastermind@kairux.ai',
      passwordHash: mastermindPassword,
      firstName: 'AI',
      lastName: 'Mastermind',
      role: 'MASTERMIND',
    },
  });

  // Create Manager user
  const managerPassword = await hashPassword('Manager123!!');
  await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: {},
    create: {
      email: 'manager@company.com',
      passwordHash: managerPassword,
      firstName: 'General',
      lastName: 'Manager',
      role: 'MANAGER',
    },
  });

  // Create standard User
  const userPassword = await hashPassword('User123!!');
  await prisma.user.upsert({
    where: { email: 'user@company.com' },
    update: {},
    create: {
      email: 'user@company.com',
      passwordHash: userPassword,
      firstName: 'Regular',
      lastName: 'Employee',
      role: 'USER',
    },
  });


  console.log('\n✅ Seeding completed!\n');
  console.log('='.repeat(60));
  console.log('📋 ERP USER CREDENTIALS');
  console.log('='.repeat(60));

  console.log('\n🏢 ERP USERS:');
  console.log('─'.repeat(60));

  console.log('Admin (System Administrator):');
  console.log('  Email: admin@company.com');
  console.log('  Password: Admin123!!');
  console.log('  Access: All ERP modules, system configuration\n');

  console.log('CFO (Chief Financial Officer):');
  console.log('  Email: cfo@company.com');
  console.log('  Password: Cfo123!!');
  console.log('  Access: Accounting & Finance, Business Intelligence, AI Insights\n');

  console.log('HR Manager (Human Resources):');
  console.log('  Email: hr@company.com');
  console.log('  Password: HrManager123!!');
  console.log('  Access: Human Resources, Employee Management, Payroll\n');

  console.log('Sales Manager (CRM):');
  console.log('  Email: sales@company.com');
  console.log('  Password: SalesManager123!!');
  console.log('  Access: CRM, Lead Management, AI Insights\n');

  console.log('Operations Manager (Supply Chain):');
  console.log('  Email: ops@company.com');
  console.log('  Password: OpsManager123!!');
  console.log('  Access: Inventory, Supply Chain, Projects\n');

  console.log('Project Manager:');
  console.log('  Email: pm@company.com');
  console.log('  Password: ProjectManager123!!');
  console.log('  Access: Project Management, Tasks, Resources, Documents\n');

  console.log('Business Analyst:');
  console.log('  Email: analyst@company.com');
  console.log('  Password: Analyst123!!');
  console.log('  Access: Read-only access to all modules for reporting\n');

  console.log('='.repeat(60));
  console.log('⚠️  IMPORTANT: Change all passwords in production!');
  console.log('='.repeat(60));

  // Seed ERP data
  console.log('\n🏢 Seeding ERP data for TechVision Consulting...');
  try {
    const { seedERPData } = await import('./seed-erp-data');
    await seedERPData();
  } catch (error) {
    console.log('⚠️  ERP data seeding skipped (models may not exist yet)');
  }

  // Seed Comprehensive ERP data
  try {
    console.log('\n🚀 Seeding comprehensive ERP data...');
    const { seedComprehensiveERP } = await import('./seed-comprehensive-erp');
    await seedComprehensiveERP();
  } catch (error) {
    console.log('⚠️  Comprehensive ERP data seeding skipped:', error);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
