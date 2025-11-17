import { getClient } from '../config/database.js';
import { logger } from '../config/logger.js';

export const submitPracticeAttempt = async ({ userId, question, canvas }) => {
  const timestamp = new Date().toISOString();

  if (process.env.MOCK_AUTH === 'true') {
    logger.debug(`[PracticeService] MOCK_AUTH enabled. Returning mock payload for user=${userId}`);
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

  try {
    const { data, error } = await client
      .from('practice_attempts')
      .insert([payload])
      .select()
      .single();

    if (error) {
      logger.error(
        `[PracticeService] Supabase insert failed | user=${userId} reason=${error.message}`,
      );
      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    logger.debug(
      `[PracticeService] Supabase insert succeeded | user=${userId} attemptId=${data?.id}`,
    );
    return data;
  } catch (error) {
    logger.error(`[PracticeService] Unexpected error during submission | user=${userId}`, error);
    throw error;
  }
};
