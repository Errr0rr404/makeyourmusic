// Admin-facing distribution endpoints. Mounted under /api/admin/distributions
// so the admin panel's triple-gate (JWT + ADMIN role + panel password)
// applies. Owner-facing endpoints (request, get) live on
// /api/tracks/:trackId/distribution and stay on the legacy trackRoutes.ts mount.

import { Router } from 'express';
import {
  adminListDistributions,
  adminUpdateDistribution,
} from '../controllers/distributionController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { requireAdminPanelToken } from '../utils/adminAuth';

const router = Router();

router.use(authenticate as any, requireAdmin as any, requireAdminPanelToken as any);

router.get('/', adminListDistributions as any);
router.patch('/:id', adminUpdateDistribution as any);

export default router;
