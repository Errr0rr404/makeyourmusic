import { Request, Response } from 'express';
import * as analyticsService from '../services/analyticsService';

export const getDashboardAnalytics = async (_req: Request, res: Response) => {
  try {
    const analytics = await analyticsService.getDashboardAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error });
  }
};