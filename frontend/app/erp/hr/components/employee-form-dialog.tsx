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
import { Employee } from '@prisma/client';
import api from '@/lib/api';

interface EmployeeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (employee: Employee) => void;
  employee?: Employee | null;
}

export function EmployeeFormDialog({
  isOpen,
  onClose,
  onSuccess,
  employee,
}: EmployeeFormDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (employee) {
      setFirstName(employee.firstName);
      setLastName(employee.lastName);
      setEmail(employee.email);
      setPhone(employee.phone || '');
      setJobTitle(employee.jobTitle);
      setDepartment(employee.department);
      setHireDate(new Date(employee.hireDate).toISOString().split('T')[0]);
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setJobTitle('');
      setDepartment('');
      setHireDate('');
    }
  }, [employee]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!firstName) newErrors.firstName = 'First name is required';
    if (!lastName) newErrors.lastName = 'Last name is required';
    if (!email) newErrors.email = 'Email is required';
    if (!jobTitle) newErrors.jobTitle = 'Job title is required';
    if (!department) newErrors.department = 'Department is required';
    if (!hireDate) newErrors.hireDate = 'Hire date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const employeeData = { firstName, lastName, email, phone, jobTitle, department, hireDate: new Date(hireDate) };

    try {
      let response;
      if (employee) {
        response = await api.put(`/erp/hr/employees/${employee.id}`, employeeData);
      } else {
        response = await api.post('/erp/hr/employees', employeeData);
      }
      onSuccess(response.data);
      onClose();
    } catch (error) {
      console.error('Failed to save employee:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{employee ? 'Edit Employee' : 'Create a New Employee'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Form fields... */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              {errors.jobTitle && <p className="text-red-500 text-xs">{errors.jobTitle}</p>}
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
              {errors.department && <p className="text-red-500 text-xs">{errors.department}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="hireDate">Hire Date</Label>
            <Input id="hireDate" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            {errors.hireDate && <p className="text-red-500 text-xs">{errors.hireDate}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={handleSubmit}>{employee ? 'Save Changes' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}