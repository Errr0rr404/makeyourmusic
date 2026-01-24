#!/bin/bash

# Create .env file for backend
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://neondb_owner:npg_3RxZco2kganv@ep-solitary-union-ahb41c0u-pooler.c-3.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Stripe (Add your keys from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Server
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
EOF

echo ".env file created successfully!"
