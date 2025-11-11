import dotenv from 'dotenv';

export const loadEnv = () => {
  const result = dotenv.config();
  if (result.error) {
    throw result.error;
  }
};
