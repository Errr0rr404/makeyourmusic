import { Router } from 'express';
import * as searchController from '../controllers/searchController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', searchController.globalSearch);

export default router;