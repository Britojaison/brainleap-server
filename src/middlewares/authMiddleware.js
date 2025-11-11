import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  const clientIp = req.ip || req.connection.remoteAddress;
  
  if (!header) {
    logger.warn(`🔒 Auth failed - Missing authorization header - IP: ${clientIp} - Path: ${req.path}`);
    return res.status(401).json({ message: 'Missing authorization header' });
  }

  const token = header.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    logger.info(`🔓 Auth success - User: ${payload.email} (${payload.id}) - IP: ${clientIp} - Path: ${req.path}`);
    next();
  } catch (error) {
    logger.warn(`🔒 Auth failed - Invalid token - IP: ${clientIp} - Path: ${req.path} - Error: ${error.message}`);
    return res.status(401).json({ message: 'Invalid token' });
  }
};
