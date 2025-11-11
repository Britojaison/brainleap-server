import { loginUser, registerUser } from '../services/authService.js';
import { successResponse } from '../utils/responseHelper.js';
import { logger } from '../config/logger.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    logger.info(`📱 POST /auth/login - Client IP: ${clientIp} - Email: ${email}`);
    
    const payload = await loginUser({ email, password });
    
    logger.info(`✅ Login response sent for: ${email}`);
    successResponse(res, payload);
  } catch (error) {
    const { email } = req.body;
    logger.error(`❌ Login error for ${email}: ${error.message}`);
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { email } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    logger.info(`📱 POST /auth/register - Client IP: ${clientIp} - Email: ${email}`);
    
    const payload = await registerUser(req.body);
    
    logger.info(`✅ Registration response sent for: ${email}`);
    successResponse(res, payload, 201);
  } catch (error) {
    const { email } = req.body;
    logger.error(`❌ Registration error for ${email}: ${error.message}`);
    next(error);
  }
};
