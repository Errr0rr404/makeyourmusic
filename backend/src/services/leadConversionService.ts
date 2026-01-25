import { PrismaClient, Prisma } from '@prisma/client';

// Define LeadStatus locally since @prisma/client doesn't export it properly
const LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  PROPOSAL: 'PROPOSAL',
  NEGOTIATION: 'NEGOTIATION',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST',
} as const;

const prisma = new PrismaClient();

export const convertLeadToCustomer = async (leadId: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const lead = await tx.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    if (!lead.email) {
      throw new Error('Lead must have an email to be converted');
    }

    const existingCustomer = await tx.customer.findUnique({
      where: { email: lead.email },
    });

    if (existingCustomer) {
      // Optionally, you could merge data here
      return existingCustomer;
    }

    const customer = await tx.customer.create({
      data: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
      },
    });

    await tx.lead.update({
      where: { id: leadId },
      data: { status: LeadStatus.CONVERTED },
    });

    return customer;
  });
};