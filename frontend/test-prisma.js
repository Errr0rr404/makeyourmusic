const { PrismaClient } = require('./generated/prisma/client.ts');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

console.log('✅ PrismaClient imported:', typeof PrismaClient);
console.log('✅ Pool imported:', typeof Pool);
console.log('✅ PrismaPg imported:', typeof PrismaPg);

const connectionString = process.env.DATABASE_URL || 'postgresql://test';
const pool = new Pool({ connectionString });
console.log('✅ Pool created');

const adapter = new PrismaPg(pool);
console.log('✅ Adapter created');

const prisma = new PrismaClient({ adapter });
console.log('✅ PrismaClient instantiated');

process.exit(0);
