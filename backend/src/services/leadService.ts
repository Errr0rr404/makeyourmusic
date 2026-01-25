import { PrismaClient } from '@prisma/client';
import { getIO } from '../socket';

const prisma = new PrismaClient();

export const getAllLeads = async () => {
  return prisma.lead.findMany();
};

export const createLead = async (data: {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  source?: string;
  notes?: string;
}) => {
  const newLead = await prisma.lead.create({ data });
  getIO().emit('lead:created', newLead);
  return newLead;
};

export const updateLead = async (id: string, data: Partial<{
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  source: string;
  notes: string;
}>) => {
  const existingLead = await prisma.lead.findUnique({ where: { id } });
  if (!existingLead) {
    return null;
  }
  const updatedLead = await prisma.lead.update({
    where: { id },
    data,
  });
  getIO().emit('lead:updated', updatedLead);
  return updatedLead;
};

export const deleteLead = async (id: string): Promise<boolean> => {
  const existingLead = await prisma.lead.findUnique({ where: { id } });
  if (!existingLead) {
    return false;
  }
  await prisma.lead.delete({ where: { id } });
  getIO().emit('lead:deleted', id);
  return true;
};