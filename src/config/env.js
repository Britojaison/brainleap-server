import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let isLoaded = false;

export const loadEnv = () => {
  if (isLoaded) {
    return;
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, '..', '..');
  const envPath = path.resolve(projectRoot, 'env', '.env');

  if (!fs.existsSync(envPath)) {
    throw new Error(
      `Environment file not found at ${envPath}. ` +
        'Create the file based on env/.env.example and restart the server.',
    );
  }

  const result = dotenv.config({ path: envPath });
  if (result.error) {
    throw new Error(`Failed to load environment from ${envPath}: ${result.error.message}`);
  }

  isLoaded = true;
};
