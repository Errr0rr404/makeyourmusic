import express from 'express';
import { getApiDocs } from '../controllers/docsController';

const router = express.Router();

// API Documentation
router.get('/docs', getApiDocs);

export default router;
