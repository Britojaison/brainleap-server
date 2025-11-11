import { getClient } from '../config/database.js';

export const listPostsByUser = async (userId) => {
  const client = getClient();
  const { data, error } = await client
    .from('posts')
    .select('id, title, created_at')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return data;
};
