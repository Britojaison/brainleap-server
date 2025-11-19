import { Router } from 'express';

import {
  login,
  register,
  sendOtp,
  verifyOtp,
} from '../controllers/authController.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);

export default router;
