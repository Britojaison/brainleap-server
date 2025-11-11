import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';

export const registerRoutes = (app) => {
  app.use('/auth', authRoutes);
  app.use('/users', userRoutes);

  // TODO: Add `/ai` routes for hint and evaluation endpoints once AI service is wired.
};
