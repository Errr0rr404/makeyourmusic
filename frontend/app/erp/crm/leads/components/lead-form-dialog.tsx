'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lead, LeadStatus, CustomField, CustomFieldValue } from '@/generated/prisma';
import api from '@/lib/api';

type CustomFieldWithValues = CustomField & { value?: string };

interface LeadFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead: Lead) => void;
  lead?: Lead | null;
  customFields: CustomField[];
}

const leadStatuses = Object.values(LeadStatus);

export function LeadFormDialog({
  isOpen,
  onClose,
  onSuccess,
  lead,
  customFields,
}: LeadFormDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<LeadStatus>(LeadStatus.NEW);
  const [customFieldValues, setCustomFieldValues] = useState<{ [key: string]: string }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (lead) {
      setName(lead.name);
      setEmail(lead.email || '');
      setPhone(lead.phone || '');
      setSource(lead.source || '');
      setStatus(lead.status);
      
      const fetchValues = async () => {
        const response = await api.get(`/erp/custom-fields/values/${lead.id}`);
        const values: CustomFieldValue[] = response.data;
        const initialValues = values.reduce((acc, v) => ({ ...acc, [v.fieldId]: v.value }), {});
        setCustomFieldValues(initialValues);
      };
      fetchValues();

    } else {
      setName('');
      setEmail('');
      setPhone('');
      setSource('');
      setStatus(LeadStatus.NEW);
      setCustomFieldValues({});
    }
  }, [lead]);

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    const leadData = { name, email, phone, source, status };

    try {
      let response;
      if (lead) {
        response = await api.put(`/erp/crm/leads/${lead.id}`, leadData);
      } else {
        response = await api.post('/erp/crm/leads', leadData);
      }
      
      const savedLead = response.data;

      for (const fieldId in customFieldValues) {
        await api.post('/erp/custom-fields/values', {
          fieldId,
          entityId: savedLead.id,
          value: customFieldValues[fieldId],
        });
      }

      onSuccess(savedLead);
      onClose();
    } catch (error) {
      console.error('Failed to save lead:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit Lead' : 'Create a New Lead'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Standard fields... */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
          </div>
          
          {/* Custom fields... */}
          {customFields.map(field => (
            <div key={field.id} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={field.id} className="text-right">{field.name}</Label>
              <Input
                id={field.id}
                type={field.type.toLowerCase()}
                value={customFieldValues[field.id] || ''}
                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                className="col-span-3"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={handleSubmit}>{lead ? 'Save Changes' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}