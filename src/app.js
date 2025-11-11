import express from 'express';
import morgan from 'morgan';
import cors from 'cors';

import { loadEnv } from './config/env.js';
import { logger } from './config/logger.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

loadEnv();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev', { stream: { write: (msg) => logger.http(msg.trim()) } }));

registerRoutes(app);

app.use(errorHandler);

export default app;
