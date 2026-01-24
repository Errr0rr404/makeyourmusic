#!/bin/bash

# Comprehensive ERP Data Seeder
# Run this script to populate all ERP modules with realistic data

echo "🏢 TechVision Consulting - ERP Data Seeder"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "prisma/seed-comprehensive-erp.ts" ]; then
    echo "❌ Error: Must be run from backend directory"
    echo "Usage: cd backend && ./seed-erp-comprehensive.sh"
    exit 1
fi

echo "📊 This will populate your ERP system with:"
echo "   ✓ 3 Office Locations"
echo "   ✓ 3 Suppliers/Vendors"
echo "   ✓ 45+ Chart of Accounts"
echo "   ✓ 5 CRM Leads"
echo "   ✓ 5 Sales Opportunities"
echo "   ✓ 3 Marketing Campaigns"
echo "   ✓ 5 Projects with 15+ Tasks"
echo "   ✓ 3 Purchase Orders"
echo "   ✓ 3 Invoices"
echo "   ✓ 4 Journal Entries"
echo "   ✓ 3 Workflows"
echo ""
echo "⚠️  Warning: This will insert data into your database."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "🚀 Starting comprehensive ERP data seed..."
echo ""

# Run the seed file
npx ts-node prisma/seed-comprehensive-erp.ts

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ERP data seeding completed successfully!"
    echo ""
    echo "📱 You can now:"
    echo "   • View CRM leads and opportunities"
    echo "   • Track projects and tasks"
    echo "   • Manage invoices and payments"
    echo "   • Review financial reports"
    echo "   • Analyze purchase orders"
    echo "   • Explore workflows"
    echo ""
else
    echo ""
    echo "❌ Error during seeding. Check the output above."
    exit 1
fi
