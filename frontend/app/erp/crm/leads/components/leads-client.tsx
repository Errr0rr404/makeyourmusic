'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import api from '@/lib/api';
import { Lead, Customer, CustomField } from '@/generated/prisma';
import { getColumns } from './columns';
import { DataTable } from './data-table';
import { LeadFormDialog } from './lead-form-dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CustomFieldManager } from './custom-field-manager';
import toast from 'react-hot-toast';
import { useSocket } from '@/components/SocketProvider';

interface LeadsClientProps {
  leads: Lead[];
  customFields: CustomField[];
}

export function LeadsClient({ leads: initialLeads, customFields: initialCustomFields }: LeadsClientProps) {
  const router = useRouter();
  const socket = useSocket();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [customFields, setCustomFields] = useState<CustomField[]>(initialCustomFields);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleLeadCreated = (newLead: Lead) => {
      setLeads((prev) => [newLead, ...prev]);
      toast.success('New lead added in real-time!');
    };

    const handleLeadUpdated = (updatedLead: Lead) => {
      setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    };

    const handleLeadDeleted = (deletedLeadId: string) => {
      setLeads((prev) => prev.filter((l) => l.id !== deletedLeadId));
    };

    socket.on('lead:created', handleLeadCreated);
    socket.on('lead:updated', handleLeadUpdated);
    socket.on('lead:deleted', handleLeadDeleted);

    return () => {
      socket.off('lead:created', handleLeadCreated);
      socket.off('lead:updated', handleLeadUpdated);
      socket.off('lead:deleted', handleLeadDeleted);
    };
  }, [socket]);

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
      // The state will be updated by the socket event
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
      // Refresh the page to get the updated lead status
      router.refresh();
    } catch (error) {
      console.error('Failed to convert lead:', error);
      toast.error('Failed to convert lead.');
    }
  };

  const handleSuccess = (updatedLead: Lead) => {
    // The state will be updated by the socket event
    setSelectedLead(null);
  };

  const columns = useMemo(() => getColumns({ onEdit: handleEditClick, onDelete: handleDeleteClick, onConvert: handleConvertClick }), [leads]);

  return (
    <>
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
        open={isConfirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Are you sure?"
        description={`This will permanently delete the lead "${selectedLead?.name}".`}
      />
    </>
  );
}