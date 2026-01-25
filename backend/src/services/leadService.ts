import { PrismaClient } from '@prisma/client';
import { getIO } from '../socket';

const prisma = new PrismaClient();

export const getAllLeads = async () => {
  return prisma.lead.findMany();
};

import { LeadStatus } from '@prisma/client';

export const createLead = async (data: {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: LeadStatus | string;
  source?: string;
  notes?: string;
}) => {
  // Convert string status to enum if needed
  const status = typeof data.status === 'string' && data.status in LeadStatus 
    ? (data.status as LeadStatus) 
    : (data.status as LeadStatus) || LeadStatus.NEW;
  
  const newLead = await prisma.lead.create({ 
    data: {
      ...data,
      status,
    } 
  });
  getIO().emit('lead:created', newLead);
  return newLead;
};

export const updateLead = async (id: string, data: Partial<{
  name: string;
  email: string;
  phone: string;
  company: string;
  status: LeadStatus | string;
  source: string;
  notes: string;
}>) => {
  const existingLead = await prisma.lead.findUnique({ where: { id } });
  if (!existingLead) {
    return null;
  }
  
  // Convert string status to enum if needed
  const updateData: any = { ...data };
  if (data.status && typeof data.status === 'string' && data.status in LeadStatus) {
    updateData.status = data.status as LeadStatus;
  }
  
  const updatedLead = await prisma.lead.update({
    where: { id },
    data: updateData,
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