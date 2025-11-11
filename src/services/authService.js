import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { getClient } from '../config/database.js';
import { findUserByEmail, insertUser } from '../models/userModel.js';

export const loginUser = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '12h' });

  return { token, user: { id: user.id, email: user.email } };
};

export const registerUser = async ({ email, password }) => {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error('Account already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const client = getClient();

  const { data, error } = await client
    .from('users')
    .insert({ email, password_hash: passwordHash })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return { id: data.id, email: data.email };
};
