import { Router } from 'express';
import { getStats, listUsers, updateUserRole, manageAgent, manageTrack, getReports, resolveReport } from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { updateRoleRules, resolveReportRules, paginationRules, validateRequest } from '../middleware/validation';

const router = Router();

router.use(authenticate as any, requireAdmin as any);

router.get('/stats', getStats as any);
router.get('/users', paginationRules, validateRequest, listUsers as any);
router.put('/users/:id/role', updateRoleRules, validateRequest, updateUserRole as any);
router.put('/agents/:id/status', manageAgent as any);
router.put('/tracks/:id/status', manageTrack as any);
router.get('/reports', getReports as any);
router.put('/reports/:id', resolveReportRules, validateRequest, resolveReport as any);

export default router;
