import { userRepository } from '@/db/repositories/userRepository';
import { sha256 } from '@/utils/hash';

// Force database authentication (bypassing Supabase client completely)
export const isSupabaseConfigured = false;
export const supabase: any = null;

// Standard interface for user details returned from authentication
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Sign in helper using local SQLite database
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  
  // Simulate minor UI latency
  await new Promise((resolve) => setTimeout(resolve, 600));
  
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  
  // Fetch user from local SQLite
  const user = await userRepository.getByEmail(cleanEmail);
  if (!user) {
    throw new Error('No account found with this email. Please sign up first.');
  }
  
  // Verify password hash
  const hashedPassword = sha256(password);
  if (user.password !== hashedPassword) {
    throw new Error('Incorrect password. Please try again.');
  }
  
  console.log('User signed in locally via SQLite:', user.id);
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

/**
 * Sign up helper using local SQLite database
 */
export async function signUpWithEmail(email: string, password: string, name: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  
  // Simulate minor UI latency
  await new Promise((resolve) => setTimeout(resolve, 600));
  
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (!name.trim()) {
    throw new Error('Name is required.');
  }
  
  // Check if account already exists
  const existingUser = await userRepository.getByEmail(cleanEmail);
  if (existingUser) {
    throw new Error('An account with this email already exists.');
  }
  
  // Generate deterministic/unique local user ID
  const id = `usr-${Math.random().toString(36).substring(2, 9)}`;
  const hashedPassword = sha256(password);
  
  await userRepository.insert({
    id,
    name: name.trim(),
    email: cleanEmail,
    password: hashedPassword,
    vault_password: undefined
  });
  
  console.log('New user created locally in SQLite:', id);
  
  return {
    id,
    email: cleanEmail,
    name: name.trim(),
  };
}

/**
 * Send password reset email (Mocked locally)
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  console.log(`Password reset requested for local user: ${email}`);
}
