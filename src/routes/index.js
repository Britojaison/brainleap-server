import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import practiceRoutes from './practiceRoutes.js';
import visionRoutes from './visionRoutes.js';
import aiRoutes from './aiRoutes.js';
import historyRoutes from './historyRoutes.js';

export const registerRoutes = (app) => {
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/practice', practiceRoutes);
  app.use('/api/vision', visionRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/history', historyRoutes);
};
