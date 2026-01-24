import { PrismaClient, Employee } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllEmployees = async (): Promise<Employee[]> => {
  return prisma.employee.findMany();
};

export const createEmployee = async (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> => {
  return prisma.employee.create({ data });
};

export const updateEmployee = async (id: string, data: Partial<Employee>): Promise<Employee | null> => {
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