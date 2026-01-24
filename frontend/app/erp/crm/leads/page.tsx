'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import api from '@/lib/api';
import { Lead, Customer, CustomField } from '@prisma/client';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { LeadFormDialog } from './components/lead-form-dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CustomFieldManager } from './components/custom-field-manager';
import toast from 'react-hot-toast';

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const fetchLeads = async () => {
    try {
      const response = await api.get('/erp/crm/leads');
      setLeads(response.data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const response = await api.get('/erp/custom-fields/Lead');
      setCustomFields(response.data);
    } catch (error) {
      console.error('Failed to fetch custom fields:', error);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchCustomFields();
  }, []);

  const handleCreateClick = () => {
    setSelectedLead(null);
    setFormModalOpen(true);
  };

  const handleEditClick = (lead: Lead) => {
    setSelectedLead(lead);
    setFormModalOpen(true);
  };

  const handleDeleteClick = (lead: Lead) => {
    setSelectedLead(lead);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedLead) return;
    try {
      await api.delete(`/erp/crm/leads/${selectedLead.id}`);
      setLeads(leads.filter((l) => l.id !== selectedLead.id));
      setConfirmDialogOpen(false);
      setSelectedLead(null);
      toast.success('Lead deleted successfully.');
    } catch (error) {
      console.error('Failed to delete lead:', error);
      toast.error('Failed to delete lead.');
    }
  };

  const handleConvertClick = async (lead: Lead) => {
    try {
      const response = await api.post('/erp/crm/leads/convert', { leadId: lead.id });
      const customer: Customer = response.data;
      toast.success(`Lead converted to customer: ${customer.name}`);
      fetchLeads();
    } catch (error) {
      console.error('Failed to convert lead:', error);
      toast.error('Failed to convert lead.');
    }
  };

  const handleSuccess = (updatedLead: Lead) => {
    if (selectedLead) {
      setLeads(leads.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    } else {
      setLeads([updatedLead, ...leads]);
    }
    setSelectedLead(null);
  };

  const columns = useMemo(() => getColumns({ onEdit: handleEditClick, onDelete: handleDeleteClick, onConvert: handleConvertClick }), [leads]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Leads</h1>
        <Button onClick={handleCreateClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </div>
      <div className="mb-8">
        <CustomFieldManager module="Lead" onFieldCreated={(field) => setCustomFields([...customFields, field])} />
      </div>
      <DataTable columns={columns} data={leads} />
      <LeadFormDialog
        isOpen={isFormModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={handleSuccess}
        lead={selectedLead}
        customFields={customFields}
      />
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Are you sure?"
        description={`This will permanently delete the lead "${selectedLead?.name}".`}
      />
    </div>
  );
}