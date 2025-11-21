import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { getClient } from '../config/database.js';

const getIsMockAuth = () => process.env.MOCK_AUTH !== 'false';

// --- Nodemailer Configuration ---
const getTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in .env');
  }
  return nodemailer.createTransport({
    service: 'gmail', // Or use 'host' and 'port' for other providers
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

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
  if (getIsMockAuth()) {
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
  if (getIsMockAuth()) {
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
    const { data: listData, error } = await client.auth.admin.listUsers();
    if (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
    const user = listData.users.find(u => u.email === email);
    return !!user;
  } catch (err) {
    console.error('Unexpected error checking user existence:', err);
    return false;
  }
};

// --- Manual OTP Logic ---

export const sendOtpCode = async ({ email, shouldCreateUser = false, displayName }) => {
  if (getIsMockAuth()) {
    console.log('📧 [MOCK] OTP would be sent to:', email);
    return { message: 'OTP sent (mock mode)' };
  }

  const client = getClient();
  console.log('📧 Sending Manual OTP to:', email, 'shouldCreateUser:', shouldCreateUser);

  // 1. Check user existence logic
  const userExists = await checkUserExists(email);

  if (!shouldCreateUser) {
    // Login flow: user must exist
    if (!userExists) {
      console.log('❌ User not found:', email);
      throw new Error('No user found with this email address. Please sign up first.');
    }
  } else {
    // Signup flow: user must NOT exist
    if (userExists) {
      console.log('❌ User already exists:', email);
      throw new Error('User already exists with this email. Please try logging in instead.');
    }
  }

  // 2. Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // 2.5 Cleanup expired OTPs for this user to keep table clean
  const { error: cleanupError } = await client
    .from('verification_codes')
    .delete()
    .eq('email', email)
    .lt('expires_at', new Date().toISOString());

  if (cleanupError) {
    console.warn('⚠️ Failed to cleanup expired OTPs:', cleanupError);
    // Not critical, so we continue
  }

  // 3. Upsert in 'verification_codes' table (update if exists, insert if not)
  const { error: dbError } = await client
    .from('verification_codes')
    .upsert({
      email,
      code: otp,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'email', // Update if email already exists
    });

  if (dbError) {
    console.error('❌ Database error storing OTP:', dbError);
    throw new Error(`Failed to store OTP: ${dbError.message}`);
  }

  // 4. Send Email via Nodemailer
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Your BrainLeap Verification Code',
      html: `
        <h2>Your Verification Code</h2>
        <p>Please enter the following code to sign in:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      `,
    });
    console.log('✅ Email sent successfully via Nodemailer');
  } catch (emailError) {
    console.error('❌ Nodemailer error:', emailError);
    throw new Error(`Failed to send email: ${emailError.message}`);
  }

  return { message: 'OTP sent successfully' };
};

export const verifyOtpCode = async ({ email, token, displayName }) => {
  if (getIsMockAuth()) {
    return buildMockResponse(email);
  }

  const client = getClient();

  console.log('🔍 Verifying OTP:', { email, token, displayName });

  // 1. Verify OTP from 'verification_codes' table
  const { data: codes, error: dbError } = await client
    .from('verification_codes')
    .select('*')
    .eq('email', email)
    .eq('code', token)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('📊 Database query result:', { codes, dbError });

  if (dbError) {
    throw new Error(`Database error verifying OTP: ${dbError.message}`);
  }

  if (!codes || codes.length === 0) {
    // Let's check if there's ANY code for this email (even expired)
    const { data: allCodes } = await client
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });

    console.log('🔍 All codes for this email:', allCodes);
    throw new Error('Invalid or expired OTP code');
  }

  // OTP is valid! Now handle user session.

  // 2. Check if user exists in Supabase Auth using listUsers
  const { data: listData, error: listError } = await client.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Failed to check user existence: ${listError.message}`);
  }

  let user = listData.users.find(u => u.email === email);

  // 3. Generate a temporary password for session creation
  const tempPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);

  if (!user) {
    // Create new user with temporary password
    const { data: newUserData, error: createError } = await client.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm since we verified OTP
      user_metadata: { display_name: displayName },
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }
    user = newUserData.user;
  } else {
    // Update existing user's password and confirm email
    const { error: updateError } = await client.auth.admin.updateUserById(user.id, {
      password: tempPassword,
      email_confirm: true, // Confirm email since we verified OTP
    });

    if (updateError) {
      throw new Error(`Failed to update user password: ${updateError.message}`);
    }
  }

  // 4. Sign in with the temporary password to get a real session
  const { data: sessionData, error: sessionError } = await client.auth.signInWithPassword({
    email,
    password: tempPassword,
  });

  if (sessionError) {
    throw new Error(`Failed to create session: ${sessionError.message}`);
  }

  // 5. Clean up used OTP
  const { error: deleteError } = await client
    .from('verification_codes')
    .delete()
    .eq('email', email)
    .eq('code', token);

  if (deleteError) {
    console.error('❌ Failed to delete used OTP:', deleteError);
    // We don't throw here because the user is already verified/logged in
  } else {
    console.log('✅ Used OTP deleted successfully');
  }

  if (displayName) {
    const { error: profileError } = await client.from('profiles').upsert({
      id: sessionData.user.id,
      email: sessionData.user.email,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error('Failed to update profile:', profileError);
      // Don't fail auth just because profile update failed
    }
  }

  return buildAuthPayload(sessionData.session, sessionData.user);
};
