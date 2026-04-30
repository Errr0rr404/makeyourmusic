import { Router } from 'express';
import {
  getStats,
  getDashboard,
  listUsers,
  getUserDetail,
  updateUserRole,
  manageAgent,
  manageTrack,
  getReports,
  resolveReport,
  listGenerations,
  getRevenue,
  verifyAdminPanelPassword,
} from '../controllers/adminController';
import { listTakedowns, resolveTakedown } from '../controllers/takedownController';
import { requireAdminPanelToken } from '../utils/adminAuth';
import {
  updateRoleRules,
  resolveReportRules,
  paginationRules,
  validateRequest,
} from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Password verify is the only public endpoint — it's how a token is obtained.
// Heavy rate-limit it because brute-force is the obvious attack.
router.post('/auth/verify', authLimiter, verifyAdminPanelPassword);

// Everything else requires a valid admin-panel token. The middleware lets
// /auth/verify through unconditionally so the password endpoint remains
// reachable; any other path 401s without a token.
router.use(requireAdminPanelToken as any);

router.get('/dashboard', getDashboard as any);
router.get('/stats', getStats as any);

router.get('/users', paginationRules, validateRequest, listUsers as any);
router.get('/users/:id', getUserDetail as any);
router.put('/users/:id/role', updateRoleRules, validateRequest, updateUserRole as any);

router.get('/generations', listGenerations as any);
router.get('/revenue', getRevenue as any);

router.put('/agents/:id/status', manageAgent as any);
router.put('/tracks/:id/status', manageTrack as any);

router.get('/reports', paginationRules, validateRequest, getReports as any);
router.put('/reports/:id', resolveReportRules, validateRequest, resolveReport as any);

router.get('/takedowns', listTakedowns as any);
router.put('/takedowns/:id', resolveTakedown as any);

export default router;
