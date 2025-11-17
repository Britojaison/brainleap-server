import { getClient } from '../config/database.js';

export const submitPracticeAttempt = async ({ userId, question, canvas }) => {
  const timestamp = new Date().toISOString();

  if (process.env.MOCK_AUTH === 'true') {
    return {
      id: `mock-${timestamp}`,
      question,
      canvas,
      created_at: timestamp,
    };
  }

  const client = getClient();
  const payload = {
    user_id: userId,
    question,
    canvas,
    created_at: timestamp,
  };

  const { data, error } = await client
    .from('practice_attempts')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  return data;
};
