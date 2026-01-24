/**
 * COMPREHENSIVE ERP SEED DATA (schema-aligned)
 * Populates ERP-focused models with realistic sample data.
 */

import { PrismaClient, Prisma, LeadStatus, ProjectStatus, InvoiceStatus, AccountType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

/**
 * COMPREHENSIVE ERP SEED DATA
 * Creates realistic, interconnected data across ALL ERP modules
 *
 * Company Profile: TechVision Consulting Inc.
 * - Industry: Technology Consulting & Software Development
 * - Size: 75 employees
 * - Annual Revenue: $8.5M
 * - Established: 2020
 * - Locations: HQ + 2 satellite offices
 */

// Load env (mirror main seed.ts behavior)
const envPath = resolve(__dirname, '../.env')
const rootEnvPath = resolve(__dirname, '../../.env')
if (require('fs').existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else if (require('fs').existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath })
} else {
  dotenv.config()
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set. Please check your .env file.')
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })

const dec = (n: string) => new Prisma.Decimal(n)
const daysAgo = (d: number) => {
  const date = new Date()
  date.setDate(date.getDate() - d)
  return date
}

export async function seedComprehensiveERP() {
  console.log('🚀 Seeding comprehensive ERP data...')

  // Chart of Accounts (subset)
  const accounts = [
    { accountNumber: '1000', accountName: 'Cash - Operating', accountType: 'ASSET' as AccountType, isActive: true, updatedAt: new Date() },
    { accountNumber: '1100', accountName: 'Accounts Receivable', accountType: 'ASSET' as AccountType, isActive: true, updatedAt: new Date() },
    { accountNumber: '2000', accountName: 'Accounts Payable', accountType: 'LIABILITY' as AccountType, isActive: true, updatedAt: new Date() },
    { accountNumber: '4000', accountName: 'Consulting Revenue', accountType: 'REVENUE' as AccountType, isActive: true, updatedAt: new Date() },
    { accountNumber: '5000', accountName: 'Salaries & Wages', accountType: 'EXPENSE' as AccountType, isActive: true, updatedAt: new Date() },
    { accountNumber: '5610', accountName: 'Cloud Infrastructure', accountType: 'EXPENSE' as AccountType, isActive: true, updatedAt: new Date() },
  ]
  for (const account of accounts) {
    await prisma.chartOfAccount.upsert({ where: { accountNumber: account.accountNumber }, update: account, create: account })
  }
  console.log(`✅ ChartOfAccount: ${accounts.length}`)

  // Get admin user for createdBy fields
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  const createdBy = adminUser?.id || 'system'

  // Leads
  const leads = [
    {
      id: 'lead-acme',
      name: 'Acme Corp Cloud Migration',
      email: 'john@acme.com',
      phone: '+1 555-1234',
      source: 'Website',
      status: LeadStatus.QUALIFIED,
      createdBy
    },
    {
      id: 'lead-techstart',
      name: 'TechStart MVP Development',
      email: 'sarah@techstart.io',
      phone: '+1 555-2345',
      source: 'Referral',
      status: LeadStatus.NEW,
      createdBy
    },
    {
      id: 'lead-finserve',
      name: 'FinServe Security Audit',
      email: 'mike@finserve.com',
      phone: '+1 555-3456',
      source: 'Conference',
      status: LeadStatus.CONTACTED,
      createdBy
    },
  ]
  for (const lead of leads) {
    await prisma.lead.upsert({ where: { id: lead.id }, update: lead, create: lead })
  }
  console.log(`✅ Leads: ${leads.length}`)

  // Opportunities
  const opps = [
    {
      id: 'opp-cloud',
      name: 'Acme Cloud Migration',
      stage: 'PROPOSAL',
      amount: dec('125000'),
      expectedCloseDate: daysAgo(-30),
      createdBy
    },
    {
      id: 'opp-mvp',
      name: 'TechStart MVP',
      stage: 'NEGOTIATION',
      amount: dec('85000'),
      expectedCloseDate: daysAgo(-15),
      createdBy
    },
    {
      id: 'opp-security',
      name: 'FinServe Security Audit',
      stage: 'QUALIFICATION',
      amount: dec('275000'),
      expectedCloseDate: daysAgo(-60),
      createdBy
    },
  ]
  for (const opp of opps) {
    await prisma.opportunity.upsert({ where: { id: opp.id }, update: opp, create: opp })
  }
  console.log(`✅ Opportunities: ${opps.length}`)

  // Projects
  const projects = [
    {
      id: 'proj-security',
      name: 'Security Audit for FinServe',
      status: ProjectStatus.IN_PROGRESS,
      startDate: daysAgo(30),
      endDate: daysAgo(-45),
      createdBy
    },
    {
      id: 'proj-cloud',
      name: 'AWS Migration for Acme',
      status: ProjectStatus.IN_PROGRESS,
      startDate: daysAgo(15),
      endDate: daysAgo(-60),
      createdBy
    },
    {
      id: 'proj-mvp',
      name: 'MVP Development for TechStart',
      status: ProjectStatus.PLANNING,
      startDate: daysAgo(-5),
      endDate: daysAgo(-90),
      createdBy
    },
  ]
  for (const project of projects) {
    await prisma.project.upsert({ where: { id: project.id }, update: project, create: project })
  }
  console.log(`✅ Projects: ${projects.length}`)

  // Project Tasks
  const tasks = [
    {
      projectId: 'proj-security',
      name: 'Initial Security Assessment',
      status: ProjectStatus.COMPLETED,
      dueDate: daysAgo(25),
      createdBy
    },
    {
      projectId: 'proj-security',
      name: 'Penetration Testing',
      status: ProjectStatus.IN_PROGRESS,
      dueDate: daysAgo(-5),
      createdBy
    },
    {
      projectId: 'proj-cloud',
      name: 'Architecture Design',
      status: ProjectStatus.COMPLETED,
      dueDate: daysAgo(5),
      createdBy
    },
    {
      projectId: 'proj-cloud',
      name: 'Data Migration',
      status: ProjectStatus.IN_PROGRESS,
      dueDate: daysAgo(-20),
      createdBy
    },
    {
      projectId: 'proj-mvp',
      name: 'Requirements Gathering',
      status: ProjectStatus.PLANNING,
      dueDate: daysAgo(-10),
      createdBy
    },
  ]
  for (const task of tasks) {
    await prisma.projectTask.create({ data: task })
  }
  console.log(`✅ ProjectTasks: ${tasks.length}`)

  // Invoices
  const invoices = [
    {
      id: 'inv-001',
      invoiceNumber: 'INV-2026-001',
      customerId: 'customer-finserve',
      issueDate: daysAgo(20),
      dueDate: daysAgo(-10),
      status: InvoiceStatus.PAID,
      total: dec('95000'),
      createdBy
    },
    {
      id: 'inv-002',
      invoiceNumber: 'INV-2026-002',
      customerId: 'customer-acme',
      issueDate: daysAgo(10),
      dueDate: daysAgo(-20),
      status: InvoiceStatus.SENT,
      total: dec('38000'),
      createdBy
    },
    {
      id: 'inv-003',
      invoiceNumber: 'INV-2026-003',
      customerId: 'customer-techstart',
      issueDate: daysAgo(5),
      dueDate: daysAgo(25),
      status: InvoiceStatus.DRAFT,
      total: dec('25000'),
      createdBy
    },
  ]
  for (const inv of invoices) {
    await prisma.invoice.upsert({ where: { id: inv.id }, update: inv, create: inv })
  }
  console.log(`✅ Invoices: ${invoices.length}`)

  // Invoice Items
  const invoiceItems = [
    { invoiceId: 'inv-001', description: 'Security Audit - Phase 1', quantity: dec('1'), unitPrice: dec('95000'), total: dec('95000') },
    { invoiceId: 'inv-002', description: 'Cloud Migration Setup', quantity: dec('1'), unitPrice: dec('38000'), total: dec('38000') },
    { invoiceId: 'inv-003', description: 'MVP Development - Discovery Phase', quantity: dec('1'), unitPrice: dec('25000'), total: dec('25000') },
  ]
  for (const item of invoiceItems) {
    await prisma.invoiceItem.create({ data: item })
  }
  console.log(`✅ InvoiceItems: ${invoiceItems.length}`)

  // Journal Entries + Lines (using accountNumber references)
  const journalEntries = [
    {
      date: daysAgo(20),
      description: 'Revenue recognition - FinServe Security Audit',
      createdBy,
      lines: [
        { accountNumber: '1100', debit: dec('95000'), credit: dec('0'), description: 'AR - FinServe' },
        { accountNumber: '4000', debit: dec('0'), credit: dec('95000'), description: 'Revenue' },
      ],
    },
    {
      date: daysAgo(15),
      description: 'Payment received - FinServe',
      createdBy,
      lines: [
        { accountNumber: '1000', debit: dec('95000'), credit: dec('0'), description: 'Cash' },
        { accountNumber: '1100', debit: dec('0'), credit: dec('95000'), description: 'Clear AR' },
      ],
    },
    {
      date: daysAgo(10),
      description: 'Cloud Infrastructure Expense',
      createdBy,
      lines: [
        { accountNumber: '5610', debit: dec('12500'), credit: dec('0'), description: 'AWS Services' },
        { accountNumber: '2000', debit: dec('0'), credit: dec('12500'), description: 'AP' },
      ],
    },
  ]

  for (const je of journalEntries) {
    // First, get account IDs from account numbers
    const accountMap = new Map<string, string>()
    for (const line of je.lines) {
      const account = await prisma.chartOfAccount.findUnique({
        where: { accountNumber: line.accountNumber },
      })
      if (account) {
        accountMap.set(line.accountNumber, account.id)
      }
    }

    await prisma.journalEntry.create({
      data: {
        entryDate: je.date,
        description: je.description,
        createdBy: je.createdBy,
        lines: {
          create: je.lines.map((l) => ({
            accountId: accountMap.get(l.accountNumber) || '',
            debit: l.debit,
            credit: l.credit,
            description: l.description,
          })),
        },
      },
    })
  }
  console.log(`✅ JournalEntries: ${journalEntries.length}`)

  console.log('🎉 Comprehensive ERP seeding complete!')
}

if (require.main === module) {
  seedComprehensiveERP()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
