import { Request, Response } from 'express';
import * as leadService from '../services/leadService';

export const getLeads = async (_req: Request, res: Response) => {
  try {
    const leads = await leadService.getAllLeads();
    return res.json(leads);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching leads', error });
  }
};

export const createLead = async (req: Request, res: Response) => {
  try {
    const newLead = await leadService.createLead(req.body);
    return res.status(201).json(newLead);
  } catch (error) {
    return res.status(500).json({ message: 'Error creating lead', error });
  }
};

export const updateLead = async (req: Request, res: Response) => {
  try {
    const updatedLead = await leadService.updateLead(String(req.params.id), req.body);
    if (!updatedLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    return res.json(updatedLead);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating lead', error });
  }
};

export const deleteLead = async (req: Request, res: Response) => {
  try {
    const deleted = await leadService.deleteLead(String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting lead', error });
  }
};
