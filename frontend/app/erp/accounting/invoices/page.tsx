'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { Invoice } from '@/generated/prisma';
import { columns } from './components/columns';
import { DataTable } from './components/data-table';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/erp/accounting/invoices');
      setInvoices(response.data);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Button asChild>
          <Link href="/erp/accounting/invoices/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Invoice
          </Link>
        </Button>
      </div>
      <DataTable columns={columns} data={invoices} />
    </div>
  );
}