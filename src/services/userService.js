import { getClient } from '../config/database.js';

export const getUserProfile = async (userId) => {
  const client = getClient();

  const { data, error } = await client
    .from('users')
    .select('id, email, display_name, last_active_at')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const recordAiSessionInteraction = async ({ userId, questionId, interactionType, payload }) => {
  // This method will be called by upcoming AI hint/evaluation controllers to persist usage analytics.
  const client = getClient();
  const { error } = await client
    .from('ai_sessions')
    .insert({ user_id: userId, question_id: questionId, interaction_type: interactionType, payload });

  if (error) {
    throw error;
  }
};
