import {
  loginUser,
  registerUser,
  sendOtpCode,
  verifyOtpCode,
} from '../services/authService.js';
import { successResponse } from '../utils/responseHelper.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const payload = await loginUser({ email, password });
    successResponse(res, payload);
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const payload = await registerUser(req.body);
    successResponse(res, payload, 201);
  } catch (error) {
    next(error);
  }
};

export const sendOtp = async (req, res, next) => {
  try {
    const { email, shouldCreateUser = false, displayName } = req.body;
    console.log('📨 OTP request received:', { email, shouldCreateUser, displayName });
    const payload = await sendOtpCode({ email, shouldCreateUser, displayName });
    successResponse(res, payload);
  } catch (error) {
    console.error('❌ OTP controller error:', error.message);
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, token, displayName } = req.body;
    const payload = await verifyOtpCode({ email, token, displayName });
    successResponse(res, payload);
  } catch (error) {
    next(error);
  }
};
