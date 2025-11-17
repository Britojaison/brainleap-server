import { loginUser, registerUser } from '../services/authService.js';
import { successResponse } from '../utils/responseHelper.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(`[LOGIN] User attempting to login: ${email}`);
    const payload = await loginUser({ email, password });
    console.log(`[LOGIN] Login successful for user: ${email} (ID: ${payload.user?.id || 'N/A'})`);
    successResponse(res, payload);
  } catch (error) {
    console.log(`[LOGIN] Login failed for user: ${email} - ${error.message}`);
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
