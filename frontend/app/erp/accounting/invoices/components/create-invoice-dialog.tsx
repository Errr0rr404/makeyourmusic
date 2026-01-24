'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Invoice } from '@prisma/client';
import api from '@/lib/api';

interface CreateInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: (invoice: Invoice) => void;
}

export function CreateInvoiceDialog({
  isOpen,
  onClose,
  onInvoiceCreated,
}: CreateInvoiceDialogProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customer, setCustomer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [total, setTotal] = useState('');

  const handleSubmit = async () => {
    try {
      const response = await api.post('/erp/accounting/invoices', {
        invoiceNumber,
        customer,
        issueDate,
        dueDate,
        total: parseFloat(total),
      });
      onInvoiceCreated(response.data);
      onClose();
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new invoice</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="invoiceNumber" className="text-right">
              Invoice Number
            </Label>
            <Input
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer" className="text-right">
              Customer
            </Label>
            <Input
              id="customer"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="issueDate" className="text-right">
              Issue Date
            </Label>
            <Input
              id="issueDate"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dueDate" className="text-right">
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="total" className="text-right">
              Total
            </Label>
            <Input
              id="total"
              type="number"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}