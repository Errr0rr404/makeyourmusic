import { PrismaClient } from '@prisma/client';

// Define types locally since @prisma/client doesn't export them properly
type FieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT';

const prisma = new PrismaClient();

export const getCustomFieldsForModule = async (module: string) => {
  return prisma.customField.findMany({ where: { module } });
};

export const createCustomField = async (data: { name: string; type: FieldType; module: string }) => {
  return prisma.customField.create({ data });
};

export const setCustomFieldValue = async (data: { fieldId: string; entityId: string; value: string }) => {
  return prisma.customFieldValue.upsert({
    where: { fieldId_entityId: { fieldId: data.fieldId, entityId: data.entityId } },
    update: { value: data.value },
    create: data,
  });
};

export const getCustomFieldValues = async (entityId: string) => {
  return prisma.customFieldValue.findMany({
    where: { entityId },
    include: { field: true },
  });
};