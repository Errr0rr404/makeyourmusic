#!/bin/bash

echo "════════════════════════════════════════"
echo "   ERP Platform - Dependency Install"
echo "════════════════════════════════════════"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend installation failed"
    exit 1
fi

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd ../backend
npm install
if [ $? -eq 0 ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Backend installation failed"
    exit 1
fi

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
cd ..
npx prisma generate --schema=prisma/schema.prisma
if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated"
else
    echo "❌ Prisma generation failed"
    exit 1
fi

echo ""
echo "════════════════════════════════════════"
echo "   ✅ Installation Complete!"
echo "════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Configure your .env files:"
echo "   - backend/.env"
echo "   - frontend/.env.local"
echo ""
echo "2. Run database migrations:"
echo "   npx prisma migrate dev --schema=prisma/schema.prisma"
echo ""
echo "3. Seed the database (optional):"
echo "   cd backend && npm run seed:all"
echo ""
echo "4. Start the application:"
echo "   ./start.sh"
echo ""
