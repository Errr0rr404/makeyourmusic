import { Request, Response } from 'express';
import * as searchService from '../services/searchService';

export const globalSearch = async (req: Request, res: Response) => {
  const { q } = req.query;

  if (typeof q !== 'string') {
    return res.status(400).json({ message: 'Query parameter "q" is required.' });
  }

  try {
    const results = await searchService.searchAcrossModules(q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error performing search', error });
  }
};