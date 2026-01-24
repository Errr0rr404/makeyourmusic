import express from 'express';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../controllers/addressController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getAddresses);
router.post('/', createAddress);
router.put('/:addressId', updateAddress);
router.delete('/:addressId', deleteAddress);

export default router;
