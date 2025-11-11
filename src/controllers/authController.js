import { loginUser, registerUser } from '../services/authService.js';
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
