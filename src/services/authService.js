import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { getClient } from '../config/database.js';
import { findUserByEmail, insertUser } from '../models/userModel.js';
import { logger } from '../config/logger.js';

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

  logger.info(`🔐 [MOCK AUTH] Generated token for: ${email}`);
  return { token, user: mockUser };
};

export const loginUser = async ({ email, password }) => {
  logger.info(`🔑 Login attempt for: ${email}`);
  
  if (isMockAuth) {
    logger.warn(`⚠️  MOCK_AUTH is enabled - bypassing real authentication`);
    logger.info(`✅ [MOCK AUTH] Login successful for: ${email}`);
    return buildMockResponse(email);
  }

  logger.info(`🔍 Looking up user in database: ${email}`);
  const user = await findUserByEmail(email);
  
  if (!user) {
    logger.error(`❌ Login failed - User not found: ${email}`);
    throw new Error('Invalid credentials');
  }

  logger.info(`🔐 Verifying password for: ${email}`);
  const isMatch = await bcrypt.compare(password, user.password_hash);
  
  if (!isMatch) {
    logger.error(`❌ Login failed - Invalid password for: ${email}`);
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '12h' });
  logger.info(`✅ Login successful for: ${email} (User ID: ${user.id})`);

  return { token, user: { id: user.id, email: user.email } };
};

export const registerUser = async ({ email, password }) => {
  logger.info(`📝 Registration attempt for: ${email}`);
  
  if (isMockAuth) {
    logger.warn(`⚠️  MOCK_AUTH is enabled - bypassing real registration`);
    logger.info(`✅ [MOCK AUTH] Registration successful for: ${email}`);
    return buildMockResponse(email).user;
  }

  logger.info(`🔍 Checking if user already exists: ${email}`);
  const existing = await findUserByEmail(email);
  
  if (existing) {
    logger.error(`❌ Registration failed - User already exists: ${email}`);
    throw new Error('Account already exists');
  }

  logger.info(`🔐 Hashing password for: ${email}`);
  const passwordHash = await bcrypt.hash(password, 12);
  const client = getClient();

  logger.info(`💾 Inserting new user into database: ${email}`);
  const { data, error } = await client
    .from('users')
    .insert({ email, password_hash: passwordHash })
    .select()
    .single();

  if (error) {
    logger.error(`❌ Registration failed - Database error for: ${email}`, error);
    throw error;
  }

  logger.info(`✅ Registration successful for: ${email} (User ID: ${data.id})`);
  return { id: data.id, email: data.email };
};
