import * as path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables from backend/.env or frontend/.env.local
const backendEnv = path.join(__dirname, '../.env');
const frontendEnv = path.join(__dirname, '../../frontend/.env.local');
if (require('fs').existsSync(backendEnv)) {
  dotenv.config({ path: backendEnv });
} else if (require('fs').existsSync(frontendEnv)) {
  dotenv.config({ path: frontendEnv });
} else {
  dotenv.config(); // Fallback to default .env
}

// Import Prisma client using the backend's db utility (handles adapter correctly)
const dbPath = path.resolve(__dirname, '../src/utils/db');
const { prisma } = require(dbPath);

async function createEmployee() {
  try {
    console.log('Creating dummy employee and setting manager passcode...\n');

    // 1. Create a user for the employee
    console.log('📧 Creating employee user...');
    const employeePassword = await bcrypt.hash('Employee123!!', 12);
    const employeeUser = await prisma.user.upsert({
      where: { email: 'employee@pos.com' },
      update: {
        passwordHash: employeePassword,
        name: 'Dummy Employee',
        role: 'CUSTOMER', // Employees are regular users
      },
      create: {
        email: 'employee@pos.com',
        passwordHash: employeePassword,
        name: 'Dummy Employee',
        role: 'CUSTOMER',
      },
    });
    console.log('✅ Employee user created:', employeeUser.email);

    // 2. Create PosEmployee record with employee code "0000"
    console.log('\n👤 Creating POS employee record...');
    const posEmployee = await (prisma as any).posEmployee.upsert({
      where: { employeeId: '0000' },
      update: {
        userId: employeeUser.id,
        employeeId: '0000',
        role: 'CASHIER',
        isActive: true,
      },
      create: {
        userId: employeeUser.id,
        employeeId: '0000',
        role: 'CASHIER',
        isActive: true,
      },
    });
    console.log('✅ POS employee created with code:', posEmployee.employeeId);

    // 3. Set manager passcode to "1111" (hashed)
    console.log('\n🔐 Setting manager passcode...');
    const managerPasscodeHash = await bcrypt.hash('1111', 12);
    
    // Get existing store config or create new one
    const prismaClient = prisma as any;
    let config = await prismaClient.storeConfig?.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    // Check if manager_passcode column exists, if not create it
    try {
      await prisma.$executeRaw`
        SELECT manager_passcode FROM store_config LIMIT 1
      `;
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.code === '42703') {
        console.log('   Creating manager_passcode column...');
        await prisma.$executeRaw`
          ALTER TABLE store_config ADD COLUMN IF NOT EXISTS manager_passcode TEXT
        `;
        console.log('   ✅ Column created');
      } else {
        throw error;
      }
    }

    if (config) {
      // Use $executeRaw to update the manager passcode field directly
      await prisma.$executeRaw`
        UPDATE store_config 
        SET manager_passcode = ${managerPasscodeHash}
        WHERE id = ${config.id}
      `;
      console.log('✅ Manager passcode updated in existing store config');
    } else {
      // Create a basic store config if none exists
      const newConfig = await prismaClient.storeConfig.create({
        data: {
          storeName: 'POS Store',
          storeType: 'general',
          primaryColor: '221 83% 53%',
          currency: 'USD',
          currencySymbol: '$',
          language: 'en',
        },
      });
      // Then update with the manager passcode using raw SQL
      await prisma.$executeRaw`
        UPDATE store_config 
        SET manager_passcode = ${managerPasscodeHash}
        WHERE id = ${newConfig.id}
      `;
      console.log('✅ Manager passcode set in new store config');
    }

    console.log('\n✅ Setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   Employee Code: 0000');
    console.log('   Manager Passcode: 1111');
    console.log('   Employee Email: employee@pos.com');
    console.log('   Employee Password: Employee123!!');
    console.log('\n⚠️  Please keep these credentials secure!');
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createEmployee();
