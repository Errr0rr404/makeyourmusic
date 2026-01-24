import { Router } from 'express';
import * as employeeController from '../controllers/employeeController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', employeeController.getEmployees);
router.post('/', employeeController.createEmployee);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

export default router;