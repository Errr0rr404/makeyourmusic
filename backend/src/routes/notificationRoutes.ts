import { Router } from 'express';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  registerPushToken,
  unregisterPushToken,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate as any);

router.get('/', listNotifications as any);
router.get('/unread-count', getUnreadCount as any);
router.put('/read-all', markAllAsRead as any);
router.put('/:id/read', markAsRead as any);
router.delete('/:id', deleteNotification as any);

// Push token lifecycle
router.post('/register-token', registerPushToken as any);
router.post('/unregister-token', unregisterPushToken as any);

export default router;
