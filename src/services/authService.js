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

const buildAuthPayload = (session, user) => ({
  token: session.access_token,
  refreshToken: session.refresh_token,
  user: {
    id: user.id,
    email: user.email,
    displayName: user.user_metadata?.display_name,
  },
});

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

  return buildAuthPayload(data.session, data.user);
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

const checkUserExists = async (email) => {
  const client = getClient();
  try {
    const { data, error } = await client.auth.admin.getUserByEmail(email);
    if (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
    return !!data?.user;
  } catch (err) {
    console.error('Unexpected error checking user existence:', err);
    return false;
  }
};

export const sendOtpCode = async ({ email, shouldCreateUser = false, displayName }) => {
  if (isMockAuth) {
    console.log('📧 [MOCK] OTP would be sent to:', email);
    return { message: 'OTP sent (mock mode)' };
  }

  const client = getClient();
  console.log('📧 Sending OTP to:', email, 'shouldCreateUser:', shouldCreateUser);
  
  // For login (shouldCreateUser=false), check if user exists first
  if (!shouldCreateUser) {
    const userExists = await checkUserExists(email);
    if (!userExists) {
      console.log('❌ User not found:', email);
      throw new Error('No user found with this email address. Please sign up first.');
    }
  }
  
  const { data, error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser,
      data: displayName ? { display_name: displayName } : undefined,
      emailRedirectTo: process.env.SUPABASE_OTP_REDIRECT_URL,
    },
  });

  if (error) {
    console.error('❌ OTP send error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Supabase OTP send failed: ${error.message}`);
  }

  console.log('✅ OTP API call successful');
  console.log('Response data:', JSON.stringify(data, null, 2));
  console.log('📧 OTP should be sent to:', email);
  
  // Note: Supabase doesn't return the OTP in the response for security
  // The OTP is sent via email automatically by Supabase
  return { message: 'OTP sent successfully' };
};

export const verifyOtpCode = async ({ email, token, displayName }) => {
  if (isMockAuth) {
    return buildMockResponse(email);
  }

  const client = getClient();
  const { data, error } = await client.auth.verifyOtp({
    type: 'email',
    email,
    token,
  });

  if (error) {
    throw new Error(`Supabase OTP verification failed: ${error.message}`);
  }

  if (!data.session || !data.user) {
    throw new Error('Supabase OTP verification did not return a session');
  }

  if (displayName) {
    const { error: profileError } = await client.from('profiles').upsert({
      id: data.user.id,
      email: data.user.email,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }
  }

  return buildAuthPayload(data.session, data.user);
};
