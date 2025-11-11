import { createClient } from '@supabase/supabase-js';

let supabaseClient;

export const initDatabase = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials are not configured');
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
};

export const getClient = () => {
  if (!supabaseClient) {
    throw new Error('Supabase client has not been initialised. Call initDatabase() first.');
  }
  return supabaseClient;
};
