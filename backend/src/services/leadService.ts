import { PrismaClient, Lead } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllLeads = async (): Promise<Lead[]> => {
  return prisma.lead.findMany();
};

export const createLead = async (data: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead> => {
  return prisma.lead.create({ data });
};

export const updateLead = async (id: string, data: Partial<Lead>): Promise<Lead | null> => {
  const existingLead = await prisma.lead.findUnique({ where: { id } });
  if (!existingLead) {
    return null;
  }
  return prisma.lead.update({
    where: { id },
    data,
  });
};

export const deleteLead = async (id: string): Promise<boolean> => {
  const existingLead = await prisma.lead.findUnique({ where: { id } });
  if (!existingLead) {
    return false;
  }
  await prisma.lead.delete({ where: { id } });
  return true;
};