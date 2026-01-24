import { Router } from 'express';
import * as productController from '../controllers/productController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', productController.getProducts);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

export default router;