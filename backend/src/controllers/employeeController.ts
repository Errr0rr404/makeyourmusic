import { Request, Response } from 'express';
import * as employeeService from '../services/employeeService';

export const getEmployees = async (_req: Request, res: Response) => {
  try {
    const employees = await employeeService.getAllEmployees();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employees', error });
  }
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const newEmployee = await employeeService.createEmployee(req.body);
    res.status(201).json(newEmployee);
  } catch (error) {
    res.status(500).json({ message: 'Error creating employee', error });
  }
};

export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const updatedEmployee = await employeeService.updateEmployee(String(req.params.id), req.body);
    if (!updatedEmployee) {
      res.status(404).json({ message: 'Employee not found' });
      return;
    }
    res.json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ message: 'Error updating employee', error });
  }
};

export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await employeeService.deleteEmployee(String(req.params.id));
    if (!deleted) {
      res.status(404).json({ message: 'Employee not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting employee', error });
  }
};