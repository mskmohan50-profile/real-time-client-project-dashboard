import { Router } from 'express';
import { getActivityFeed } from '../controllers/activityController.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

router.use(authenticateToken);

router.get('/feed', getActivityFeed);

export default router;
