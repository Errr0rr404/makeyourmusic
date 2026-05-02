import { Router } from 'express';
import {
  createApp,
  updateApp,
  rotateSecret,
  listMyApps,
  listPublicApps,
  getPublicApp,
  adminListApps,
  adminUpdateApp,
} from '../controllers/developerAppController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { requireAdminPanelToken } from '../utils/adminAuth';

const router = Router();

// Specific routes BEFORE the slug-matched routes so /apps/mine isn't
// shadowed by the :slug parameter pattern.
router.get('/apps/mine', authenticate as any, listMyApps as any);
router.post('/apps', authenticate as any, createApp as any);
router.patch('/apps/:id', authenticate as any, updateApp as any);
router.post('/apps/:id/rotate-secret', authenticate as any, rotateSecret as any);

// Public (registry).
router.get('/apps', listPublicApps as any);
router.get('/apps/:slug', getPublicApp as any);

// Admin review queue. Same triple gate as /api/admin/distributions.
router.get('/admin/apps', authenticate as any, requireAdmin as any, requireAdminPanelToken as any, adminListApps as any);
router.patch('/admin/apps/:id', authenticate as any, requireAdmin as any, requireAdminPanelToken as any, adminUpdateApp as any);

export default router;
