import http from 'http';

import app from './app.js';
import { logger } from './config/logger.js';

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for device access

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  logger.info(`Server listening on http://${HOST}:${PORT}`);
});

export default server;
