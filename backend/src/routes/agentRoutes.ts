import { Router } from 'express';
import { createAgent, getAgent, listAgents, updateAgent, getMyAgents, deleteAgent } from '../controllers/agentController';
import { publicAgentEarnings, topEarners } from '../controllers/earningsController';
import { agentFeed } from '../controllers/agentFeedController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { createAgentRules, updateAgentRules, paginationRules, validateRequest } from '../middleware/validation';

const router = Router();

router.get('/', paginationRules, validateRequest, listAgents as any);
router.get('/mine', authenticate as any, getMyAgents as any);
router.get('/top-earners', topEarners as any);
router.get('/:slug/earnings', publicAgentEarnings as any);
router.get('/:slug/feed.xml', agentFeed as any);
router.get('/:idOrSlug', optionalAuth as any, getAgent as any);
router.post('/', authenticate as any, createAgentRules, validateRequest, createAgent as any);
router.put('/:id', authenticate as any, updateAgentRules, validateRequest, updateAgent as any);
router.delete('/:id', authenticate as any, deleteAgent as any);

export default router;
