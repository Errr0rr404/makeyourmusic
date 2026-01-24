'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Invoice, InvoiceItem } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

export default function InvoiceDetailsPage() {
  const params = useParams();
  const { id } = params;
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);

  useEffect(() => {
    if (id) {
      const fetchInvoice = async () => {
        try {
          const response = await api.get(`/erp/accounting/invoices/${id}`);
          setInvoice(response.data);
        } catch (error) {
          console.error('Failed to fetch invoice:', error);
        }
      };
      fetchInvoice();
    }
  }, [id]);

  if (!invoice) {
    return <div>Loading...</div>;
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoice {invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground">Issued on {new Date(invoice.issueDate).toLocaleDateString()}</p>
          </div>
          <Badge>{invoice.status}</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="font-semibold mb-2">Billed To:</h3>
              <p>{invoice.customerId}</p>
            </div>
            <div className="text-right">
              <h3 className="font-semibold mb-2">Due Date:</h3>
              <p>{new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          <h3 className="font-semibold mb-4">Items</h3>
          <div className="border rounded-md">
            <div className="grid grid-cols-4 font-semibold p-4 border-b">
              <div>Description</div>
              <div className="text-center">Quantity</div>
              <div className="text-right">Unit Price</div>
              <div className="text-right">Total</div>
            </div>
            {invoice.items.map((item) => (
              <div key={item.id} className="grid grid-cols-4 p-4 border-b">
                <div>{item.description}</div>
                <div className="text-center">{item.quantity}</div>
                <div className="text-right">{formatCurrency(Number(item.unitPrice))}</div>
                <div className="text-right">{formatCurrency(Number(item.total))}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-8">
            <div className="w-full max-w-xs">
              <div className="flex justify-between">
                <span className="font-semibold">Subtotal:</span>
                <span>{formatCurrency(Number(invoice.total))}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mt-2">
                <span>Total:</span>
                <span>{formatCurrency(Number(invoice.total))}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}