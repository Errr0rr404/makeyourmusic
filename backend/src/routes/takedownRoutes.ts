import { Router } from 'express';
import { fileTakedown, withdrawTakedown } from '../controllers/takedownController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// Public DMCA filing — submitter need not be logged in. We capture userId
// when present so admins can see who filed.
router.post('/', optionalAuth as any, fileTakedown as any);
router.post('/:id/withdraw', withdrawTakedown as any);

export default router;
