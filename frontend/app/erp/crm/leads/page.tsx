import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { CustomFieldManager } from './components/custom-field-manager';
import { prisma } from '@/lib/server/utils/db';
import { LeadsClient } from './components/leads-client';

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany();
  const customFields = await prisma.customField.findMany({ where: { module: 'Lead' } });

  return (
    <div className="container mx-auto py-10">
      <LeadsClient leads={leads} customFields={customFields} />
    </div>
  );
}