import { Router } from 'express';
import {
  createParty,
  getParty,
  joinParty,
  leaveParty,
  endParty,
  listMyParties,
} from '../controllers/partyController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.post('/', authenticate as any, createParty as any);
router.get('/mine', authenticate as any, listMyParties as any);
router.get('/:code', getParty as any);
router.post('/:code/join', optionalAuth as any, joinParty as any);
router.post('/:code/leave', optionalAuth as any, leaveParty as any);
router.post('/:code/end', authenticate as any, endParty as any);

export default router;
