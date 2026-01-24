import { Request, Response } from 'express';
import * as leadService from '../services/leadService';

export const getLeads = async (req: Request, res: Response) => {
  try {
    const leads = await leadService.getAllLeads();
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leads', error });
  }
};

export const createLead = async (req: Request, res: Response) => {
  try {
    const newLead = await leadService.createLead(req.body);
    res.status(201).json(newLead);
  } catch (error) {
    res.status(500).json({ message: 'Error creating lead', error });
  }
};

export const updateLead = async (req: Request, res: Response) => {
  try {
    const updatedLead = await leadService.updateLead(req.params.id, req.body);
    if (!updatedLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json(updatedLead);
  } catch (error) {
    res.status(500).json({ message: 'Error updating lead', error });
  }
};

export const deleteLead = async (req: Request, res: Response) => {
  try {
    const deleted = await leadService.deleteLead(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting lead', error });
  }
};