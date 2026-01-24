import { Router } from 'express';
import * as customFieldController from '../controllers/customFieldController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/:module', customFieldController.getCustomFields);
router.post('/', customFieldController.createCustomField);
router.get('/values/:entityId', customFieldController.getCustomFieldValues);
router.post('/values', customFieldController.setCustomFieldValue);

export default router;