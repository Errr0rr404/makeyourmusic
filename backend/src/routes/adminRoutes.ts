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
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  updateRoleRules,
  resolveReportRules,
  paginationRules,
  validateRequest,
} from '../middleware/validation';
import { adminLoginLimiter } from '../middleware/rateLimiter';

const router = Router();

// Password verify is the only public endpoint — it's how a token is obtained.
// Heavy rate-limit it because brute-force is the obvious attack. Uses a
// dedicated limiter (no skipSuccessfulRequests) so successful brute-force
// guesses still get throttled.
router.post('/auth/verify', adminLoginLimiter, verifyAdminPanelPassword);

// Defense in depth: every admin endpoint must satisfy ALL of:
//   1) authenticate — caller has a valid user JWT (so actions are attributable)
//   2) requireAdmin  — caller's role is ADMIN (revokeable per-user without rotating env)
//   3) requireAdminPanelToken — caller has typed ADMIN_PASSWORD recently
//
// Previously only (3) was enforced, meaning anyone with the panel password
// could act with no user identity attached.
router.use(authenticate as any, requireAdmin as any, requireAdminPanelToken as any);

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
