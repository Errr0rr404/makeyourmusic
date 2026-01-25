import { Request, Response } from 'express';
import * as customFieldService from '../services/customFieldService';

export const getCustomFields = async (req: Request, res: Response) => {
  const { module } = req.params;
  try {
    const fields = await customFieldService.getCustomFieldsForModule(String(module));
    res.json(fields);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching custom fields', error });
  }
};

export const createCustomField = async (req: Request, res: Response) => {
  try {
    const newField = await customFieldService.createCustomField(req.body);
    res.status(201).json(newField);
  } catch (error) {
    res.status(500).json({ message: 'Error creating custom field', error });
  }
};

export const getCustomFieldValues = async (req: Request, res: Response) => {
  const { entityId } = req.params;
  try {
    const values = await customFieldService.getCustomFieldValues(String(entityId));
    res.json(values);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching custom field values', error });
  }
};

export const setCustomFieldValue = async (req: Request, res: Response) => {
  try {
    const { fieldId, entityId, value } = req.body;
    const result = await customFieldService.setCustomFieldValue({ fieldId, entityId, value });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error setting custom field value', error });
  }
};