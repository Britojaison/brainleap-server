import { logger } from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(err.message);
  const status = err.status || 500;
  
  // For user-facing errors (4xx), return 400 status
  const isUserError = err.message?.includes('No user found') || 
                      err.message?.includes('not found') ||
                      err.message?.includes('invalid') ||
                      err.message?.includes('failed');
  const httpStatus = isUserError ? 400 : status;
  
  res.status(httpStatus).json({
    success: false,
    message: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
