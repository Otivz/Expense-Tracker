import { createClient } from '@supabase/supabase-js';

// Get env variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = 
  supabaseUrl.trim().length > 0 && 
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.trim().length > 0;

// Initialize Supabase Client if configured
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // We will handle persistence manually with SecureStore
      },
    })
  : null;

// Standard interface for user details returned from authentication
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Sign in helper with graceful mock fallback
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error('Failed to retrieve user details.');
    
    return {
      id: data.user.id,
      email: data.user.email || cleanEmail,
      name: data.user.user_metadata?.name || cleanEmail.split('@')[0],
    };
  } else {
    // Simulated mock authentication for UI demo purposes
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate network latency
    
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    
    // In mock mode, we derive a unique ID from the email
    const id = `mock-uid-${Buffer.from(cleanEmail).toString('base64').substring(0, 16)}`;
    const name = cleanEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
      
    return {
      id,
      email: cleanEmail,
      name: name || 'User',
    };
  }
}

/**
 * Sign up helper with graceful mock fallback
 */
export async function signUpWithEmail(email: string, password: string, name: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error('Failed to create account.');
    
    return {
      id: data.user.id,
      email: data.user.email || cleanEmail,
      name: name.trim(),
    };
  } else {
    // Simulated mock authentication for UI demo purposes
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate network latency
    
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (!name.trim()) {
      throw new Error('Name is required.');
    }
    
    const id = `mock-uid-${Buffer.from(cleanEmail).toString('base64').substring(0, 16)}`;
    
    return {
      id,
      email: cleanEmail,
      name: name.trim(),
    };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) throw error;
  } else {
    // Simulated latency
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
}
