'use client';

import { useState, useEffect } from 'react';
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
import { CustomField, FieldType } from '@/generated/prisma';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface CustomFieldManagerProps {
  module: string;
  onFieldCreated: (field: CustomField) => void;
}

export function CustomFieldManager({ module, onFieldCreated }: CustomFieldManagerProps) {
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>(FieldType.TEXT);

  const handleCreateField = async () => {
    if (!fieldName) {
      toast.error('Field name is required.');
      return;
    }

    try {
      const response = await api.post('/erp/custom-fields', {
        name: fieldName,
        type: fieldType,
        module,
      });
      toast.success('Custom field created!');
      onFieldCreated(response.data);
      setFieldName('');
    } catch (error) {
      console.error('Failed to create custom field:', error);
      toast.error('Failed to create custom field.');
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-4">Manage Custom Fields</h3>
      <div className="flex items-end gap-4">
        <div className="flex-grow">
          <Label htmlFor="fieldName">Field Name</Label>
          <Input
            id="fieldName"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="fieldType">Field Type</Label>
          <Select onValueChange={(v) => setFieldType(v as FieldType)} defaultValue={FieldType.TEXT}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(FieldType).map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreateField}>Add Field</Button>
      </div>
    </div>
  );
}