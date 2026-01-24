import { Request, Response } from 'express';
import * as leadConversionService from '../services/leadConversionService';

export const convertLead = async (req: Request, res: Response) => {
  const { leadId } = req.body;

  if (!leadId) {
    return res.status(400).json({ message: 'leadId is required' });
  }

  try {
    const customer = await leadConversionService.convertLeadToCustomer(leadId);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Error converting lead', error: (error as Error).message });
  }
};