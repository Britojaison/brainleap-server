import express from 'express';
import morgan from 'morgan';
import cors from 'cors';

import { loadEnv } from './config/env.js';
import { initDatabase } from './config/database.js';
import { logger } from './config/logger.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

loadEnv();

console.log('DEBUG: MOCK_AUTH value:', process.env.MOCK_AUTH);
console.log('DEBUG: Type of MOCK_AUTH:', typeof process.env.MOCK_AUTH);

const isMockAuth = process.env.MOCK_AUTH !== 'false';
if (isMockAuth) {
  logger.warn('MOCK_AUTH is enabled. Supabase will not be initialised.');
} else {
  initDatabase();
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev', { stream: { write: (msg) => logger.http(msg.trim()) } }));

registerRoutes(app);

app.use(errorHandler);

export default app;
