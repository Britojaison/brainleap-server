import jwt from 'jsonwebtoken';

import { getClient } from '../config/database.js';

const isMockAuth = process.env.MOCK_AUTH !== 'false';
const buildMockResponse = (email) => {
  const secret = process.env.JWT_SECRET || 'mock-secret';
  const mockUser = {
    id: 'mock-user',
    email,
  };

  const token = jwt.sign({ id: mockUser.id, email: mockUser.email }, secret, {
    expiresIn: '12h',
  });

  return { token, user: mockUser };
};

export const loginUser = async ({ email, password }) => {
  if (isMockAuth) {
    return buildMockResponse(email);
  }

  const client = getClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(`Supabase login failed: ${error.message}`);
  }

  if (!data.session || !data.user) {
    throw new Error('Supabase login did not return a session');
  }

  return {
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  };
};

export const registerUser = async ({ email, password }) => {
  if (isMockAuth) {
    return buildMockResponse(email).user;
  }

  const client = getClient();
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Supabase registration failed: ${error.message}`);
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
};
