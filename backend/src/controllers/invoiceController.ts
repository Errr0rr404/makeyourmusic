import { Request, Response } from 'express';
import * as invoiceService from '../services/invoiceService';

export const getInvoices = async (_req: Request, res: Response) => {
  try {
    const invoices = await invoiceService.getAllInvoices();
    return res.json(invoices);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching invoices', error });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const invoice = await invoiceService.getInvoiceById(String(req.params.id));
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    return res.json(invoice);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching invoice', error });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const newInvoice = await invoiceService.createInvoice(req.body);
    return res.status(201).json(newInvoice);
  } catch (error) {
    return res.status(500).json({ message: 'Error creating invoice', error });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const updatedInvoice = await invoiceService.updateInvoice(String(req.params.id), req.body);
    if (!updatedInvoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    return res.json(updatedInvoice);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating invoice', error });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const deleted = await invoiceService.deleteInvoice(String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting invoice', error });
  }
};
