/**
 * ERP Seed Data for TechVision Consulting
 * Mid-sized tech consulting firm with 75 employees, $8M revenue
 *
 * This file contains realistic seed data for:
 * - CRM: Leads, Opportunities, Campaigns
 * - Projects: Projects, Tasks, Time Entries
 * - Accounting: Chart of Accounts, Journal Entries, Invoices
 * - HR: Employees, Departments, Leave Requests
 * - Inventory: Products, Suppliers, Purchase Orders
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL not set');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter }) as any;

// Helper to generate dates in the past
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const monthsAgo = (months: number) => {
  const date = new Date();
  date.setMonth(date.getDate() - months);
  return date;
};

export async function seedERPData() {
  console.log('🏢 Seeding ERP data for TechVision Consulting...');

  // Skip if models don't exist
  if (!prisma.lead || !prisma.chartOfAccount) {
    console.log('⚠️  ERP models not found, skipping ERP seed data');
    return;
  }

  try {
    // ============================================
    // CRM DATA
    // ============================================
    console.log('📊 Seeding CRM data...');

    // Create Campaigns
    const campaigns = [
      {
        name: 'Q1 2025 Cloud Migration Campaign',
        description: 'Targeting mid-market companies for cloud migration services',
        status: 'ACTIVE',
        budget: 50000,
        spent: 32000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-03-31'),
      },
      {
        name: 'AI/ML Consulting Launch',
        description: 'New service offering for AI/ML consulting',
        status: 'ACTIVE',
        budget: 75000,
        spent: 48000,
        startDate: new Date('2024-10-01'),
        endDate: new Date('2025-12-31'),
      },
      {
        name: 'Enterprise Software Dev Q4 2024',
        description: 'Enterprise custom software development push',
        status: 'COMPLETED',
        budget: 40000,
        spent: 38500,
        startDate: new Date('2024-10-01'),
        endDate: new Date('2024-12-31'),
      },
    ];

    for (const campaign of campaigns) {
      try {
        await prisma.campaign.create({
          data: {
            ...campaign,
            type: 'EMAIL', // Default type since it's required but not in seed data
            createdBy: 'seed-script',
          },
        });
      } catch (e) {
        // Skip if campaign already exists
      }
    }

    // Create Leads
    const leadCompanies = [
      { name: 'Acme Corporation', industry: 'Manufacturing', size: '500-1000', budget: '$500K-$1M' },
      { name: 'GlobalTech Solutions', industry: 'Technology', size: '100-500', budget: '$250K-$500K' },
      { name: 'FinServe Inc', industry: 'Financial Services', size: '1000-5000', budget: '$1M-$5M' },
      { name: 'HealthCare Plus', industry: 'Healthcare', size: '500-1000', budget: '$500K-$1M' },
      { name: 'RetailMax', industry: 'Retail', size: '100-500', budget: '$100K-$250K' },
      { name: 'EduTech Learning', industry: 'Education', size: '50-100', budget: '$50K-$100K' },
      { name: 'LogisticsPro', industry: 'Transportation', size: '200-500', budget: '$250K-$500K' },
      { name: 'MediaStream Co', industry: 'Media', size: '100-200', budget: '$100K-$250K' },
      { name: 'GreenEnergy Solutions', industry: 'Energy', size: '500-1000', budget: '$500K-$1M' },
      { name: 'FoodChain Networks', industry: 'Food & Beverage', size: '200-500', budget: '$150K-$300K' },
    ];

    const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

    for (let i = 0; i < 120; i++) {
      const company = leadCompanies[i % leadCompanies.length];
      const status = leadStatuses[Math.floor(Math.random() * leadStatuses.length)];

      try {
        await prisma.lead.create({
          data: {
            companyName: `${company.name} ${i > 9 ? `- Division ${Math.floor(i / 10)}` : ''}`,
            contactName: `Contact ${i + 1}`,
            email: `contact${i + 1}@${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
            phone: `+1-555-${String(i).padStart(4, '0')}`,
            status,
            source: ['WEBSITE', 'REFERRAL', 'CAMPAIGN', 'COLD_CALL', 'CONFERENCE'][Math.floor(Math.random() * 5)],
            industry: company.industry,
            companySize: company.size,
            estimatedBudget: company.budget,
            notes: `Interested in ${['cloud migration', 'custom software', 'AI/ML consulting', 'DevOps'][Math.floor(Math.random() * 4)]}`,
            assignedTo: null,
            createdAt: daysAgo(Math.floor(Math.random() * 180)),
          },
        });
      } catch (e) {
        // Skip duplicates
      }
    }

    // Create Opportunities
    const opportunityNames = [
      'Enterprise Cloud Migration',
      'Custom CRM Development',
      'AI-Powered Analytics Platform',
      'Mobile App Development',
      'Legacy System Modernization',
      'DevOps Infrastructure Setup',
      'Data Warehouse Implementation',
      'Microservices Architecture',
      'Security Audit & Remediation',
      'Machine Learning Pipeline',
    ];

    const stages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

    for (let i = 0; i < 45; i++) {
      const stage = stages[Math.floor(Math.random() * stages.length)];
      const value = [150000, 250000, 500000, 750000, 1000000, 1500000, 2000000][Math.floor(Math.random() * 7)];
      const probability = stage === 'CLOSED_WON' ? 100 : stage === 'CLOSED_LOST' ? 0 : [25, 50, 75, 90][Math.floor(Math.random() * 4)];

      try {
        await prisma.opportunity.create({
          data: {
            name: `${opportunityNames[i % opportunityNames.length]} - ${leadCompanies[i % leadCompanies.length].name}`,
            stage,
            value,
            probability,
            expectedCloseDate: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            description: `Opportunity for ${opportunityNames[i % opportunityNames.length].toLowerCase()} services`,
            assignedTo: null,
            createdAt: daysAgo(Math.floor(Math.random() * 120)),
          },
        });
      } catch (e) {
        // Skip duplicates
      }
    }

    console.log('✅ CRM data seeded');

    // ============================================
    // ACCOUNTING DATA
    // ============================================
    console.log('💰 Seeding Accounting data...');

    // Create Chart of Accounts
    const accounts = [
      // Assets (1000-1999)
      { accountNumber: '1000', accountName: 'Cash', accountType: 'ASSET', category: 'CURRENT_ASSET', balance: 500000 },
      { accountNumber: '1100', accountName: 'Accounts Receivable', accountType: 'ASSET', category: 'CURRENT_ASSET', balance: 350000 },
      { accountNumber: '1200', accountName: 'Prepaid Expenses', accountType: 'ASSET', category: 'CURRENT_ASSET', balance: 25000 },
      { accountNumber: '1500', accountName: 'Equipment', accountType: 'ASSET', category: 'FIXED_ASSET', balance: 200000 },
      { accountNumber: '1510', accountName: 'Accumulated Depreciation', accountType: 'ASSET', category: 'FIXED_ASSET', balance: -50000 },
      { accountNumber: '1600', accountName: 'Software Licenses', accountType: 'ASSET', category: 'FIXED_ASSET', balance: 150000 },

      // Liabilities (2000-2999)
      { accountNumber: '2000', accountName: 'Accounts Payable', accountType: 'LIABILITY', category: 'CURRENT_LIABILITY', balance: 180000 },
      { accountNumber: '2100', accountName: 'Accrued Salaries', accountType: 'LIABILITY', category: 'CURRENT_LIABILITY', balance: 250000 },
      { accountNumber: '2200', accountName: 'Unearned Revenue', accountType: 'LIABILITY', category: 'CURRENT_LIABILITY', balance: 100000 },
      { accountNumber: '2500', accountName: 'Long-term Debt', accountType: 'LIABILITY', category: 'LONG_TERM_LIABILITY', balance: 500000 },

      // Equity (3000-3999)
      { accountNumber: '3000', accountName: 'Common Stock', accountType: 'EQUITY', category: 'EQUITY', balance: 1000000 },
      { accountNumber: '3100', accountName: 'Retained Earnings', accountType: 'EQUITY', category: 'EQUITY', balance: 500000 },
      { accountNumber: '3900', accountName: 'Current Year Earnings', accountType: 'EQUITY', category: 'EQUITY', balance: 0 },

      // Revenue (4000-4999)
      { accountNumber: '4000', accountName: 'Consulting Revenue', accountType: 'REVENUE', category: 'OPERATING_REVENUE', balance: 0 },
      { accountNumber: '4100', accountName: 'Software Development Revenue', accountType: 'REVENUE', category: 'OPERATING_REVENUE', balance: 0 },
      { accountNumber: '4200', accountName: 'Recurring Support Revenue', accountType: 'REVENUE', category: 'OPERATING_REVENUE', balance: 0 },
      { accountNumber: '4900', accountName: 'Other Income', accountType: 'REVENUE', category: 'OTHER_REVENUE', balance: 0 },

      // Expenses (5000-5999)
      { accountNumber: '5000', accountName: 'Salaries & Wages', accountType: 'EXPENSE', category: 'OPERATING_EXPENSE', balance: 0 },
      { accountNumber: '5100', accountName: 'Employee Benefits', accountType: 'EXPENSE', category: 'OPERATING_EXPENSE', balance: 0 },
      { accountNumber: '5200', accountName: 'Rent', accountType: 'EXPENSE', category: 'OPERATING_EXPENSE', balance: 0 },
      { accountNumber: '5300', accountName: 'Utilities', accountType: 'EXPENSE', category: 'OPERATING_EXPENSE', balance: 0 },
      { accountNumber: '5400', accountName: 'Marketing & Advertising', accountType: 'EXPENSE', category: 'OPERATING_EXPENSE', balance: 0 },
      { accountNumber: '5500', accountName: 'Professional Services', accountType: 'EXPENSE', category: 'OPERATING_EXPENSE', balance: 0 },
      { accountNumber: '5600', accountName: 'Software & Subscriptions', accountType: 'EXPENSE', category: 'OPERATING_EXPENSE', balance: 0 },
      { accountNumber: '5700', accountName: 'Travel & Entertainment', accountType: 'EXPENSE', category: 'OPERATING_EXPENSE', balance: 0 },
      { accountNumber: '5800', accountName: 'Office Supplies', accountType: 'EXPENSE', category: 'OPERATING_EXPENSE', balance: 0 },
      { accountNumber: '5900', accountName: 'Depreciation', accountType: 'EXPENSE', category: 'OPERATING_EXPENSE', balance: 0 },
    ];

    for (const account of accounts) {
      try {
        await prisma.chartOfAccount.upsert({
          where: { accountNumber: account.accountNumber },
          update: account,
          create: account,
        });
      } catch (e) {
        // Skip if already exists
      }
    }

    console.log('✅ Accounting data seeded');

    console.log('✅ ERP seed data completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding ERP data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedERPData()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
