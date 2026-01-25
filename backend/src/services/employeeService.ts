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
  department?: string;
  position?: string;
  salary?: number;
}) => {
  return prisma.employee.create({ data });
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