const { defineConfig } = require('@prisma/config');
require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });

module.exports = defineConfig({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_3RxZco2kganv@ep-solitary-union-ahb41c0u-pooler.c-3.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require',
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_3RxZco2kganv@ep-solitary-union-ahb41c0u-pooler.c-3.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require',
    },
  },
});
