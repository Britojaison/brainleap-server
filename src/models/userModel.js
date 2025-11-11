import { getClient } from '../config/database.js';

export const findUserByEmail = async (email) => {
  const client = getClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

export const insertUser = async ({ email, passwordHash }) => {
  const client = getClient();
  const { data, error } = await client
    .from('users')
    .insert({ email, password_hash: passwordHash })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};
