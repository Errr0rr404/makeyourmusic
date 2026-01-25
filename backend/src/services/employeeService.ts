import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllEmployees = async () => {
  return prisma.employee.findMany();
};

export const createEmployee = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  hireDate: Date;
  department: string;
  jobTitle: string;
  employeeId?: string;
  position?: string; // Alias for jobTitle (will be converted)
  salary?: number;
}) => {
  // Generate employeeId if not provided
  const employeeId = data.employeeId || `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Remove position and use jobTitle instead
  const { position, ...employeeData } = data;
  
  return prisma.employee.create({ 
    data: {
      ...employeeData,
      employeeId,
      jobTitle: data.jobTitle || position || 'Employee',
    } 
  });
};

export const updateEmployee = async (id: string, data: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  hireDate: Date;
  department: string;
  position: string;
  salary: number;
}>) => {
  const existingEmployee = await prisma.employee.findUnique({ where: { id } });
  if (!existingEmployee) {
    return null;
  }
  return prisma.employee.update({
    where: { id },
    data,
  });
};

export const deleteEmployee = async (id: string): Promise<boolean> => {
  const existingEmployee = await prisma.employee.findUnique({ where: { id } });
  if (!existingEmployee) {
    return false;
  }
  await prisma.employee.delete({ where: { id } });
  return true;
};