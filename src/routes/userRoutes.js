import { Router } from 'express';

import { requireAuth } from '../middlewares/authMiddleware.js';
import { getProfile } from '../controllers/userController.js';

const router = Router();

router.get('/me', requireAuth, getProfile);

export default router;
