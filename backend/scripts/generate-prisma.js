#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Try different possible schema locations
const possiblePaths = [
  path.join(__dirname, '../../prisma/schema.prisma'), // From backend/scripts/
  path.join(__dirname, '../prisma/schema.prisma'),    // From backend/
  path.join(process.cwd(), '../prisma/schema.prisma'), // Relative to current working directory
  path.join(process.cwd(), '../../prisma/schema.prisma'),
];

let schemaPath = null;
for (const possiblePath of possiblePaths) {
  if (fs.existsSync(possiblePath)) {
    schemaPath = possiblePath;
    console.log(`✓ Found Prisma schema at: ${schemaPath}`);
    break;
  }
}

if (!schemaPath) {
  console.error('❌ Prisma schema not found in any expected location:');
  possiblePaths.forEach(p => console.error(`  - ${p}`));
  process.exit(1);
}

try {
  console.log(`🔧 Generating Prisma client from: ${schemaPath}`);
  execSync(`npx prisma generate --schema=${schemaPath}`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  console.log('✅ Prisma client generated successfully');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  process.exit(1);
}
