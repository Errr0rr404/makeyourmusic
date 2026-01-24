import { Request, Response } from 'express';
import * as invoiceService from '../services/invoiceService';

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const invoices = await invoiceService.getAllInvoices();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invoices', error });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invoice', error });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const newInvoice = await invoiceService.createInvoice(req.body);
    res.status(201).json(newInvoice);
  } catch (error) {
    res.status(500).json({ message: 'Error creating invoice', error });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const updatedInvoice = await invoiceService.updateInvoice(req.params.id, req.body);
    if (!updatedInvoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: 'Error updating invoice', error });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const deleted = await invoiceService.deleteInvoice(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting invoice', error });
  }
};