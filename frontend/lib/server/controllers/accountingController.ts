import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { AppError } from '../utils/errorHandler';
import { requireAccountingAccess } from '../middleware/authHelpers';

// Utility: collision-resistant identifier generators
const randomTag = () => Math.random().toString(36).substring(2, 8).toUpperCase();
const dateTag = () => new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

interface JournalEntryLine {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  productId?: string;
}

const generateEntryNumber = async (): Promise<string> => {
  // Format: JE-YYYYMMDD-<random>
  return `JE-${dateTag()}-${randomTag()}`;
};

const generateInvoiceNumber = async (invoiceType: 'SALES' | 'PURCHASE'): Promise<string> => {
  // Format: INV-YYYYMMDD-<random> or PO-YYYYMMDD-<random>
  const prefix = invoiceType === 'SALES' ? 'INV' : 'PO';
  return `${prefix}-${dateTag()}-${randomTag()}`;
};

// Get chart of accounts
export const getChartOfAccounts = async (req: NextRequest): Promise<NextResponse> => {
  requireAccountingAccess(req);

  const accounts = await prisma.chartOfAccount.findMany({
    where: { isActive: true },
    orderBy: [{ accountNumber: 'asc' }],
    include: {
      children: {
        where: { isActive: true },
        orderBy: [{ accountNumber: 'asc' }],
      },
    },
  });

  return NextResponse.json(accounts);
};

// Create chart of account
export const createChartOfAccount = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireAccountingAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND', 'CFO'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const body = await req.json();
  const { accountNumber, accountName, accountType, parentId, description } = body;

  if (!accountNumber || !accountName || !accountType) {
    throw new AppError('Account number, name, and type are required', 400);
  }

  // Check if account number already exists
  const existingAccount = await prisma.chartOfAccount.findUnique({
    where: { accountNumber },
  });

  if (existingAccount) {
    throw new AppError('Account number already exists', 400);
  }

  // Validate parent account exists if provided
  if (parentId) {
    const parentAccount = await prisma.chartOfAccount.findUnique({
      where: { id: parentId },
    });
    if (!parentAccount) {
      throw new AppError('Parent account not found', 404);
    }
  }

  const account = await prisma.chartOfAccount.create({
    data: {
      accountNumber,
      accountName,
      accountType,
      parentId: parentId || null,
      description,
      level: parentId ? 2 : 1,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(account);
};

// Get journal entries
export const getJournalEntries = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireAccountingAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND', 'CFO', 'ANALYST'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
  const statusParam = searchParams.get('status');

  // Type-safe where clause for JournalEntry
  type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';
  const validStatuses: JournalEntryStatus[] = ['DRAFT', 'POSTED', 'CANCELLED'];

  const where: { status?: JournalEntryStatus } = {};
  if (statusParam && validStatuses.includes(statusParam as JournalEntryStatus)) {
    where.status = statusParam as JournalEntryStatus;
  }

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { entryDate: 'desc' },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    }),
    prisma.journalEntry.count({ where }),
  ]);

  return NextResponse.json({
    entries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// Create journal entry
export const createJournalEntry = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireAccountingAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND', 'CFO'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const body = await req.json();
  const { entryDate, description, reference, lines } = body;

  if (!entryDate || !lines || !Array.isArray(lines) || lines.length < 2) {
    throw new AppError('Entry date and at least 2 lines are required', 400);
  }

  // Validate double-entry bookkeeping
  const totalDebit = (lines as JournalEntryLine[]).reduce((sum: number, line) => {
    const debit = Number(line.debit || 0);
    if (isNaN(debit) || debit < 0) {
      throw new AppError(`Invalid debit amount in line: ${line.description || 'Unknown'}`, 400);
    }
    return sum + debit;
  }, 0);
  
  const totalCredit = (lines as JournalEntryLine[]).reduce((sum: number, line) => {
    const credit = Number(line.credit || 0);
    if (isNaN(credit) || credit < 0) {
      throw new AppError(`Invalid credit amount in line: ${line.description || 'Unknown'}`, 400);
    }
    return sum + credit;
  }, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new AppError(`Debits and credits must balance. Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`, 400);
  }
  
  // Validate each line has either debit or credit, not both
  for (const line of lines as JournalEntryLine[]) {
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);
    if (debit > 0 && credit > 0) {
      throw new AppError('Each line must have either debit or credit, not both', 400);
    }
    if (debit === 0 && credit === 0) {
      throw new AppError('Each line must have either debit or credit', 400);
    }
  }

  // Validate all accounts exist
  const accountIds = (lines as JournalEntryLine[]).map((line) => line.accountId).filter(Boolean);
  const uniqueAccountIds = [...new Set(accountIds)];
  const accounts = await prisma.chartOfAccount.findMany({
    where: { id: { in: uniqueAccountIds } },
  });

  if (accounts.length !== uniqueAccountIds.length) {
    const foundIds = accounts.map(a => a.id);
    const missingIds = uniqueAccountIds.filter(id => !foundIds.includes(id));
    throw new AppError(`Invalid account IDs: ${missingIds.join(', ')}`, 400);
  }

  // Generate unique entry number
  const entryNumber = await generateEntryNumber();
  const existing = await prisma.journalEntry.findUnique({ where: { entryNumber } }).catch(() => null);
  if (existing) {
    const retryNumber = await generateEntryNumber();
    const retryExisting = await prisma.journalEntry.findUnique({ where: { entryNumber: retryNumber } }).catch(() => null);
    if (retryExisting) {
      throw new AppError('Failed to generate unique entry number', 500);
    }
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: retryNumber,
        entryDate: new Date(entryDate),
        description,
        reference,
        status: 'DRAFT',
        createdBy: user.userId,
        updatedAt: new Date(),
        lines: {
          create: (lines as JournalEntryLine[]).map((line, index: number) => ({
            accountId: line.accountId,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description,
            lineNumber: index + 1,
          })),
        },
      },
      include: {
        lines: { include: { account: true } },
      },
    });
    return NextResponse.json(journalEntry);
  }

  const journalEntry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      entryDate: new Date(entryDate),
      description,
      reference,
      status: 'DRAFT',
      createdBy: user.userId,
      updatedAt: new Date(),
      lines: {
        create: (lines as JournalEntryLine[]).map((line, index: number) => ({
          accountId: line.accountId,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description,
          lineNumber: index + 1,
        })),
      },
    },
    include: {
      lines: { include: { account: true } },
    },
  });

  return NextResponse.json(journalEntry);
};

// Post journal entry
export const postJournalEntry = async (req: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
  const user = requireAccountingAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND', 'CFO'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const params = await context.params;
  const { id } = params;

  const journalEntry = await prisma.journalEntry.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!journalEntry) {
    throw new AppError('Journal entry not found', 404);
  }

  if (journalEntry.status === 'POSTED') {
    throw new AppError('Journal entry already posted', 400);
  }

  // Validate journal entry has lines
  if (!journalEntry.lines || journalEntry.lines.length === 0) {
    throw new AppError('Journal entry must have at least one line', 400);
  }

  // Create accounting transactions
  const transactions = journalEntry.lines.map((line) => {
    if (!line.accountId) {
      throw new AppError('All lines must have an account ID', 400);
    }
    return {
      transactionDate: journalEntry.entryDate,
      accountId: line.accountId,
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      description: line.description || journalEntry.description || '',
      referenceType: 'JOURNAL_ENTRY',
      referenceId: journalEntry.id,
      journalEntryId: journalEntry.id,
    };
  });

  // Validate transactions before creating
  const totalDebit = transactions.reduce((sum, t) => sum + Number(t.debit), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + Number(t.credit), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new AppError('Journal entry transactions are not balanced', 400);
  }

  await prisma.$transaction([
    prisma.accountingTransaction.createMany({
      data: transactions,
    }),
    prisma.journalEntry.update({
      where: { id },
      data: {
        status: 'POSTED',
        postedAt: new Date(),
        postedBy: user.userId,
      },
    }),
  ]);

  return NextResponse.json({ success: true, message: 'Journal entry posted successfully' });
};

// Get invoices
export const getInvoices = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireAccountingAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND', 'CFO', 'SALES_MANAGER', 'ANALYST'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
  const typeParam = searchParams.get('type');
  const statusParam = searchParams.get('status');

  type InvoiceType = 'SALES' | 'PURCHASE';
  type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

  const where: { invoiceType?: InvoiceType; status?: InvoiceStatus } = {};
  if (typeParam && ['SALES', 'PURCHASE'].includes(typeParam)) {
    where.invoiceType = typeParam as InvoiceType;
  }
  if (statusParam && ['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'].includes(statusParam)) {
    where.status = statusParam as InvoiceStatus;
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { issueDate: 'desc' },
      include: {
        items: true,
        payments: true,
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({
    invoices,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// Create invoice
export const createInvoice = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireAccountingAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND', 'CFO', 'SALES_MANAGER'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const body = await req.json();
  const { invoiceType, customerId, vendorId, orderId, issueDate, dueDate, items, notes } = body;

  if (!invoiceType || !issueDate || !dueDate || !items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Invoice type, dates, and items are required', 400);
  }

  // Validate invoice type
  if (!['SALES', 'PURCHASE'].includes(invoiceType)) {
    throw new AppError('Invalid invoice type. Must be SALES or PURCHASE', 400);
  }

  // Validate dates
  const issue = new Date(issueDate);
  const due = new Date(dueDate);
  if (isNaN(issue.getTime()) || isNaN(due.getTime())) {
    throw new AppError('Invalid date format', 400);
  }
  if (due < issue) {
    throw new AppError('Due date must be after issue date', 400);
  }

  // Validate customer/vendor based on invoice type
  if (invoiceType === 'SALES' && !customerId) {
    throw new AppError('Customer ID is required for sales invoices', 400);
  }
  if (invoiceType === 'PURCHASE' && !vendorId) {
    throw new AppError('Vendor ID is required for purchase invoices', 400);
  }

  // Validate items
  for (const item of items as InvoiceItem[]) {
    if (!item.description || item.quantity === undefined || item.unitPrice === undefined) {
      throw new AppError('Each item must have description, quantity, and unitPrice', 400);
    }
    if (Number(item.quantity) <= 0 || Number(item.unitPrice) < 0) {
      throw new AppError('Quantity must be positive and unit price must be non-negative', 400);
    }
  }

  const subtotal = (items as InvoiceItem[]).reduce((sum: number, item) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unitPrice || 0);
    if (isNaN(qty) || isNaN(price) || qty < 0 || price < 0) {
      throw new AppError(`Invalid quantity or price in item: ${item.description || 'Unknown'}`, 400);
    }
    return sum + (qty * price);
  }, 0);
  
  const tax = (items as InvoiceItem[]).reduce((sum: number, item) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unitPrice || 0);
    const rate = Number(item.taxRate || 0);
    const itemTotal = qty * price;
    return sum + (itemTotal * rate);
  }, 0);
  
  const discount = 0;
  const total = subtotal + tax - discount;
  
  // Validate totals are valid numbers
  if (isNaN(subtotal) || isNaN(tax) || isNaN(total) || total < 0) {
    throw new AppError('Invalid invoice totals calculated', 400);
  }

  // Generate unique invoice number
  const invoiceNumber = await generateInvoiceNumber(invoiceType as 'SALES' | 'PURCHASE');
  const existing = await prisma.invoice.findUnique({ where: { invoiceNumber } }).catch(() => null);
  if (existing) {
    const retryNumber = await generateInvoiceNumber(invoiceType as 'SALES' | 'PURCHASE');
    const retryExisting = await prisma.invoice.findUnique({ where: { invoiceNumber: retryNumber } }).catch(() => null);
    if (retryExisting) {
      throw new AppError('Failed to generate unique invoice number', 500);
    }
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: retryNumber,
        customerId: customerId || null,
        vendorId: vendorId || null,
        orderId: orderId || null,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        subtotal,
        tax,
        discount,
        total,
        paidAmount: 0,
        status: 'DRAFT',
        notes,
        createdBy: user.userId,
        items: {
          create: (items as InvoiceItem[]).map((item, index: number) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            taxRate: item.taxRate ? Number(item.taxRate) : null,
            total: Number(item.quantity) * Number(item.unitPrice) * (1 + Number(item.taxRate || 0)),
            lineNumber: index + 1,
          })),
        },
      },
      include: { items: true },
    });
    return NextResponse.json(invoice);
  }
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId: customerId || null,
      vendorId: vendorId || null,
      orderId: orderId || null,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      subtotal,
      tax,
      discount,
      total,
      paidAmount: 0,
      status: 'DRAFT',
      notes,
      createdBy: user.userId,
      items: {
        create: (items as InvoiceItem[]).map((item, index: number) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: item.taxRate ? Number(item.taxRate) : null,
          total: Number(item.quantity) * Number(item.unitPrice) * (1 + Number(item.taxRate || 0)),
          lineNumber: index + 1,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(invoice);
};

// Record invoice payment
export const recordInvoicePayment = async (req: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
  const user = requireAccountingAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND', 'CFO'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const params = await context.params;
  const { id } = params;
  const body = await req.json();
  const { paymentDate, amount, paymentMethod, reference, notes } = body;

  if (!paymentDate || !amount || !paymentMethod) {
    throw new AppError('Payment date, amount, and method are required', 400);
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  // Prevent overpayment
  const currentPaid = Number(invoice.paidAmount);
  const invoiceTotal = Number(invoice.total);
  const paymentAmount = Number(amount);

  if (currentPaid >= invoiceTotal) {
    throw new AppError('Invoice is already fully paid', 400);
  }

  const newPaidAmount = currentPaid + paymentAmount;
  
  // Validate payment amount
  if (paymentAmount <= 0) {
    throw new AppError('Payment amount must be greater than zero', 400);
  }
  
  // Prevent paying more than the total
  if (newPaidAmount > invoiceTotal) {
    const maxPayment = invoiceTotal - currentPaid;
    throw new AppError(`Payment amount exceeds invoice balance. Maximum payment: ${maxPayment.toFixed(2)}`, 400);
  }

  const status = newPaidAmount >= invoiceTotal ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : invoice.status;

  await prisma.$transaction([
    prisma.invoicePayment.create({
      data: {
        invoiceId: id,
        paymentDate: new Date(paymentDate),
        amount: Number(amount),
        paymentMethod,
        reference,
        notes,
        createdBy: user.userId,
      },
    }),
    prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status,
      },
    }),
  ]);

  return NextResponse.json({ success: true, message: 'Payment recorded successfully' });
};

// Get financial reports
export const getFinancialReports = async (req: NextRequest): Promise<NextResponse> => {
  const user = requireAccountingAccess(req);

  const hasAccess = ['ADMIN', 'MASTERMIND', 'CFO', 'ANALYST'].includes(user.role);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const { searchParams } = new URL(req.url);
  const reportType = searchParams.get('type') || 'balance_sheet';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate') || new Date().toISOString();

  // Validate report type
  const validReportTypes = ['balance_sheet', 'income_statement', 'cash_flow', 'trial_balance', 'aged_receivables', 'aged_payables'];
  if (!validReportTypes.includes(reportType)) {
    throw new AppError(`Invalid report type. Must be one of: ${validReportTypes.join(', ')}`, 400);
  }

  // Validate dates
  let start: Date | null = null;
  const end: Date = new Date(endDate);
  if (startDate) {
    start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw new AppError('Invalid start date format', 400);
    }
  }
  if (isNaN(end.getTime())) {
    throw new AppError('Invalid end date format', 400);
  }
  if (start && end < start) {
    throw new AppError('End date must be after start date', 400);
  }

  let reportData: any = {};

  // Generate reports based on type
  switch (reportType) {
    case 'balance_sheet':
      reportData = await generateBalanceSheet(end);
      break;
    case 'income_statement':
      reportData = await generateIncomeStatement(start || new Date(new Date().getFullYear(), 0, 1), end);
      break;
    case 'cash_flow':
      reportData = await generateCashFlowStatement(start || new Date(new Date().getFullYear(), 0, 1), end);
      break;
    case 'trial_balance':
      reportData = await generateTrialBalance(end);
      break;
    case 'aged_receivables':
      reportData = await generateAgedReceivables(end);
      break;
    case 'aged_payables':
      reportData = await generateAgedPayables(end);
      break;
  }

  return NextResponse.json({ reportType, data: reportData, startDate, endDate, generatedAt: new Date().toISOString() });
};

// Helper function: Generate Balance Sheet
async function generateBalanceSheet(asOfDate: Date) {
  // Get all accounts
  const accounts = await prisma.chartOfAccount.findMany({
    where: { isActive: true },
    orderBy: { accountNumber: 'asc' },
  });

  // Get transactions up to the date
  const transactions = await prisma.accountingTransaction.findMany({
    where: {
      transactionDate: { lte: asOfDate },
    },
    include: {
      account: true,
    },
  });

  // Calculate balances by account
  const balances = new Map<string, { debit: number; credit: number }>();

  for (const txn of transactions) {
    const current = balances.get(txn.accountId) || { debit: 0, credit: 0 };
    current.debit += Number(txn.debit);
    current.credit += Number(txn.credit);
    balances.set(txn.accountId, current);
  }

  // Categorize by account type
  const assets: any[] = [];
  const liabilities: any[] = [];
  const equity: any[] = [];

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const account of accounts) {
    const balance = balances.get(account.id) || { debit: 0, credit: 0 };
    const netBalance = Number(balance.debit) - Number(balance.credit);

    if (netBalance === 0) continue; // Skip zero-balance accounts

    const accountData = {
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      balance: Math.abs(netBalance),
    };

    switch (account.accountType) {
      case 'ASSET':
        assets.push(accountData);
        totalAssets += netBalance;
        break;
      case 'LIABILITY':
        liabilities.push(accountData);
        totalLiabilities += Math.abs(netBalance);
        break;
      case 'EQUITY':
        equity.push(accountData);
        totalEquity += Math.abs(netBalance);
        break;
    }
  }

  return {
    asOfDate,
    assets: { accounts: assets, total: totalAssets },
    liabilities: { accounts: liabilities, total: totalLiabilities },
    equity: { accounts: equity, total: totalEquity },
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
}

// Helper function: Generate Income Statement
async function generateIncomeStatement(startDate: Date, endDate: Date) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      isActive: true,
      accountType: { in: ['REVENUE', 'EXPENSE'] },
    },
    orderBy: { accountNumber: 'asc' },
  });

  const transactions = await prisma.accountingTransaction.findMany({
    where: {
      transactionDate: { gte: startDate, lte: endDate },
    },
    include: {
      account: true,
    },
  });

  const balances = new Map<string, { debit: number; credit: number }>();

  for (const txn of transactions) {
    const current = balances.get(txn.accountId) || { debit: 0, credit: 0 };
    current.debit += Number(txn.debit);
    current.credit += Number(txn.credit);
    balances.set(txn.accountId, current);
  }

  const revenue: any[] = [];
  const expenses: any[] = [];
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const account of accounts) {
    const balance = balances.get(account.id) || { debit: 0, credit: 0 };
    const netBalance = Number(balance.credit) - Number(balance.debit);

    if (netBalance === 0) continue;

    const accountData = {
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      amount: Math.abs(netBalance),
    };

    if (account.accountType === 'REVENUE') {
      revenue.push(accountData);
      totalRevenue += Math.abs(netBalance);
    } else if (account.accountType === 'EXPENSE') {
      expenses.push(accountData);
      totalExpenses += Math.abs(netBalance);
    }
  }

  const netIncome = totalRevenue - totalExpenses;

  return {
    period: { startDate, endDate },
    revenue: { accounts: revenue, total: totalRevenue },
    expenses: { accounts: expenses, total: totalExpenses },
    grossProfit: totalRevenue,
    netIncome,
    profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
  };
}

// Helper function: Generate Cash Flow Statement
async function generateCashFlowStatement(startDate: Date, endDate: Date) {
  // Simplified cash flow - would need more detailed categorization in production
  const transactions = await prisma.accountingTransaction.findMany({
    where: {
      transactionDate: { gte: startDate, lte: endDate },
    },
    include: {
      account: true,
    },
  });

  let operating = 0;
  let investing = 0;
  let financing = 0;

  // Categorize transactions (simplified logic)
  for (const txn of transactions) {
    const amount = Number(txn.debit) - Number(txn.credit);

    // This is simplified - in reality, you'd need more sophisticated categorization
    if (txn.account.accountType === 'REVENUE' || txn.account.accountType === 'EXPENSE') {
      operating += amount;
    } else if (txn.account.accountName.toLowerCase().includes('investment')) {
      investing += amount;
    } else if (txn.account.accountName.toLowerCase().includes('loan') ||
               txn.account.accountName.toLowerCase().includes('equity')) {
      financing += amount;
    }
  }

  const netChange = operating + investing + financing;

  return {
    period: { startDate, endDate },
    operating,
    investing,
    financing,
    netChange,
    operatingItems: [],
    investingItems: [],
    financingItems: [],
  };
}

// Helper function: Generate Trial Balance
async function generateTrialBalance(asOfDate: Date) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { isActive: true },
    orderBy: { accountNumber: 'asc' },
  });

  const transactions = await prisma.accountingTransaction.findMany({
    where: {
      transactionDate: { lte: asOfDate },
    },
  });

  const balances = new Map<string, { debit: number; credit: number }>();

  for (const txn of transactions) {
    const current = balances.get(txn.accountId) || { debit: 0, credit: 0 };
    current.debit += Number(txn.debit);
    current.credit += Number(txn.credit);
    balances.set(txn.accountId, current);
  }

  const accountBalances: any[] = [];
  let totalDebits = 0;
  let totalCredits = 0;

  for (const account of accounts) {
    const balance = balances.get(account.id) || { debit: 0, credit: 0 };
    const debitBalance = Number(balance.debit);
    const creditBalance = Number(balance.credit);

    if (debitBalance === 0 && creditBalance === 0) continue;

    accountBalances.push({
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      accountType: account.accountType,
      debit: debitBalance,
      credit: creditBalance,
    });

    totalDebits += debitBalance;
    totalCredits += creditBalance;
  }

  return {
    asOfDate,
    accounts: accountBalances,
    totalDebits,
    totalCredits,
    balanced: Math.abs(totalDebits - totalCredits) < 0.01,
    difference: totalDebits - totalCredits,
  };
}

// Helper function: Generate Aged Receivables
async function generateAgedReceivables(asOfDate: Date) {
  const receivables = await prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
    },
    orderBy: { dueDate: 'asc' },
  });

  const aging = {
    current: [] as any[],
    days30: [] as any[],
    days60: [] as any[],
    days90: [] as any[],
    over90: [] as any[],
  };

  let totalCurrent = 0;
  let total30 = 0;
  let total60 = 0;
  let total90 = 0;
  let totalOver90 = 0;

  for (const invoice of receivables) {
    const dueDate = new Date(invoice.dueDate);
    const daysOverdue = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const balance = Number(invoice.total) - Number(invoice.paidAmount);

    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      dueDate: invoice.dueDate,
      balance,
      daysOverdue,
    };

    if (daysOverdue <= 0) {
      aging.current.push(invoiceData);
      totalCurrent += balance;
    } else if (daysOverdue <= 30) {
      aging.days30.push(invoiceData);
      total30 += balance;
    } else if (daysOverdue <= 60) {
      aging.days60.push(invoiceData);
      total60 += balance;
    } else if (daysOverdue <= 90) {
      aging.days90.push(invoiceData);
      total90 += balance;
    } else {
      aging.over90.push(invoiceData);
      totalOver90 += balance;
    }
  }

  return {
    asOfDate,
    current: { invoices: aging.current, total: totalCurrent },
    days1to30: { invoices: aging.days30, total: total30 },
    days31to60: { invoices: aging.days60, total: total60 },
    days61to90: { invoices: aging.days90, total: total90 },
    over90: { invoices: aging.over90, total: totalOver90 },
    grandTotal: totalCurrent + total30 + total60 + total90 + totalOver90,
  };
}

// Helper function: Generate Aged Payables
async function generateAgedPayables(asOfDate: Date) {
  const payables = await prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
    },
    orderBy: { dueDate: 'asc' },
  });

  const aging = {
    current: [] as any[],
    days30: [] as any[],
    days60: [] as any[],
    days90: [] as any[],
    over90: [] as any[],
  };

  let totalCurrent = 0;
  let total30 = 0;
  let total60 = 0;
  let total90 = 0;
  let totalOver90 = 0;

  for (const invoice of payables) {
    const dueDate = new Date(invoice.dueDate);
    const daysOverdue = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const balance = Number(invoice.total) - Number(invoice.paidAmount);

    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      vendorId: invoice.vendorId,
      dueDate: invoice.dueDate,
      balance,
      daysOverdue,
    };

    if (daysOverdue <= 0) {
      aging.current.push(invoiceData);
      totalCurrent += balance;
    } else if (daysOverdue <= 30) {
      aging.days30.push(invoiceData);
      total30 += balance;
    } else if (daysOverdue <= 60) {
      aging.days60.push(invoiceData);
      total60 += balance;
    } else if (daysOverdue <= 90) {
      aging.days90.push(invoiceData);
      total90 += balance;
    } else {
      aging.over90.push(invoiceData);
      totalOver90 += balance;
    }
  }

  return {
    asOfDate,
    current: { invoices: aging.current, total: totalCurrent },
    days1to30: { invoices: aging.days30, total: total30 },
    days31to60: { invoices: aging.days60, total: total60 },
    days61to90: { invoices: aging.days90, total: total90 },
    over90: { invoices: aging.over90, total: totalOver90 },
    grandTotal: totalCurrent + total30 + total60 + total90 + totalOver90,
  };
}
