'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Invoice, InvoiceStatus } from '@/generated/prisma';

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  customerId: z.string().min(1, 'Customer is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  status: z.nativeEnum(InvoiceStatus),
  items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(0.01, 'Quantity must be positive'),
    unitPrice: z.number().min(0.01, 'Unit price must be positive'),
  })).min(1, 'At least one item is required'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoice?: Invoice & { items: { description: string; quantity: number; unitPrice: number }[] };
}

export function InvoiceForm({ invoice }: InvoiceFormProps) {
  const router = useRouter();
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      ...invoice,
      issueDate: invoice ? new Date(invoice.issueDate).toISOString().split('T')[0] : '',
      dueDate: invoice ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
      items: invoice?.items ?? [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const [total, setTotal] = useState(0);
  const items = watch('items');

  useEffect(() => {
    const newTotal = items.reduce((acc, item) => acc + (item.quantity || 0) * (item.unitPrice || 0), 0);
    setTotal(newTotal);
  }, [items]);

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      if (invoice) {
        await api.put(`/erp/accounting/invoices/${invoice.id}`, data);
      } else {
        await api.post('/erp/accounting/invoices', data);
      }
      router.push('/erp/accounting/invoices');
    } catch (error) {
      console.error('Failed to save invoice:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form Fields */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-4 mb-4">
              <Input {...register(`items.${index}.description`)} placeholder="Description" />
              <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} placeholder="Quantity" />
              <Input type="number" {...register(`items.${index}.unitPrice`, { valueAsNumber: true })} placeholder="Unit Price" />
              <Button type="button" variant="destructive" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}>
            Add Item
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end items-center gap-4">
        <h3 className="text-xl font-bold">Total: {total.toFixed(2)}</h3>
        <Button type="submit">{invoice ? 'Save Changes' : 'Create Invoice'}</Button>
      </div>
    </form>
  );
}