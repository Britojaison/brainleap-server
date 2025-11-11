import { logger } from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(err.message);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
