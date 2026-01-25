'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import api from '@/lib/api';
import { Employee } from '@/generated/prisma';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { EmployeeFormDialog } from './components/employee-form-dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function HRPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/erp/hr/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateClick = () => {
    setSelectedEmployee(null);
    setFormModalOpen(true);
  };

  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormModalOpen(true);
  };

  const handleDeleteClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedEmployee) return;
    try {
      await api.delete(`/erp/hr/employees/${selectedEmployee.id}`);
      setEmployees(employees.filter((e) => e.id !== selectedEmployee.id));
      setConfirmDialogOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Failed to delete employee:', error);
    }
  };

  const handleSuccess = (updatedEmployee: Employee) => {
    if (selectedEmployee) {
      setEmployees(employees.map((e) => (e.id === updatedEmployee.id ? updatedEmployee : e)));
    } else {
      setEmployees([updatedEmployee, ...employees]);
    }
    setSelectedEmployee(null);
  };

  const columns = useMemo(() => getColumns({ onEdit: handleEditClick, onDelete: handleDeleteClick }), [employees]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Human Resources</h1>
        <Button onClick={handleCreateClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>
      <DataTable columns={columns} data={employees} />
      <EmployeeFormDialog
        isOpen={isFormModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={handleSuccess}
        employee={selectedEmployee}
      />
      <ConfirmDialog
        open={isConfirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Are you sure?"
        description={`This will permanently delete the employee "${selectedEmployee?.firstName} ${selectedEmployee?.lastName}".`}
      />
    </div>
  );
}