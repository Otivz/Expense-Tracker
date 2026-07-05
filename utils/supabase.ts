import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { userRepository } from '@/db/repositories/userRepository';
import { sha256 } from '@/utils/hash';

// Complete auth session redirections (primarily for web/OAuth callback handler)
WebBrowser.maybeCompleteAuthSession();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom SecureStore storage adapter that supports chunking for values larger than 2048 bytes (Android SecureStore limit)
const ChunkedSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      
      const value = await SecureStore.getItemAsync(key);
      if (!value) return null;

      if (value.startsWith('chunked:')) {
        const numChunks = parseInt(value.substring(8), 10);
        let fullValue = '';
        for (let i = 0; i < numChunks; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
          if (!chunk) return null;
          fullValue += chunk;
        }
        return fullValue;
      }
      return value;
    } catch (e) {
      console.error('Supabase SecureStore Read Error:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }

      // First clean up any existing chunks
      const oldValue = await SecureStore.getItemAsync(key);
      if (oldValue && oldValue.startsWith('chunked:')) {
        const numChunks = parseInt(oldValue.substring(8), 10);
        for (let i = 0; i < numChunks; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
      }

      const limit = 2000; // Keep slightly below 2048 to be safe
      if (value.length > limit) {
        const numChunks = Math.ceil(value.length / limit);
        await SecureStore.setItemAsync(key, `chunked:${numChunks}`);
        for (let i = 0; i < numChunks; i++) {
          const chunk = value.substring(i * limit, (i + 1) * limit);
          await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
        }
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (e) {
      console.error('Supabase SecureStore Write Error:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }

      const oldValue = await SecureStore.getItemAsync(key);
      if (oldValue && oldValue.startsWith('chunked:')) {
        const numChunks = parseInt(oldValue.substring(8), 10);
        for (let i = 0; i < numChunks; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error('Supabase SecureStore Delete Error:', e);
    }
  },
};

// Check if credentials are correct / not defaults
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseUrl.trim() !== ''
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: ChunkedSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Done manually via deep linking on native
      },
    })
  : null;

// Standard interface for user details returned from authentication
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  vaultCombination?: number[];
}

/**
 * Parses URL query parameters/hashes returned during redirect flows
 */
const getParamsFromUrl = (url: string): Record<string, string> => {
  const params: Record<string, string> = {};
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const searchPart = hashIndex !== -1 
    ? url.substring(hashIndex + 1) 
    : (queryIndex !== -1 ? url.substring(queryIndex + 1) : '');
  
  if (searchPart) {
    const pairs = searchPart.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
  }
  return params;
};

/**
 * Sign in helper using Supabase (with fallback to local SQLite database if not configured)
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // Fallback if Supabase is not configured
  if (!isSupabaseConfigured || !supabase) {
    console.log('Using SQLite fallback for sign-in');
    const user = await userRepository.getByEmail(cleanEmail);
    if (!user) {
      throw new Error('No account found with this email. Please sign up first.');
    }
    const hashedPassword = sha256(password);
    if (user.password !== hashedPassword) {
      throw new Error('Incorrect password. Please try again.');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  // Real Supabase Auth Sign In
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Login failed. Please try again.');
  }

  return {
    id: data.user.id,
    email: data.user.email || cleanEmail,
    name: data.user.user_metadata?.name || 'Supabase User',
    vaultCombination: data.user.user_metadata?.vault_combination,
  };
}

/**
 * Sign up helper using Supabase (with fallback to local SQLite database if not configured)
 */
export async function signUpWithEmail(email: string, password: string, name: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (!name.trim()) {
    throw new Error('Name is required.');
  }

  // Fallback if Supabase is not configured
  if (!isSupabaseConfigured || !supabase) {
    console.log('Using SQLite fallback for sign-up');
    const existingUser = await userRepository.getByEmail(cleanEmail);
    if (existingUser) {
      throw new Error('An account with this email already exists.');
    }
    const id = `usr-${Math.random().toString(36).substring(2, 9)}`;
    const hashedPassword = sha256(password);
    
    await userRepository.insert({
      id,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      vault_password: undefined
    });
    
    return {
      id,
      email: cleanEmail,
      name: name.trim(),
    };
  }

  // Real Supabase Auth Sign Up
  const redirectUrl = Linking.createURL('/');
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: { name: name.trim() },
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Sign up failed. Please try again.');
  }

  // Check if confirmation is required (session is null, which is standard when confirmation is enabled)
  if (data.session === null) {
    // We throw a custom success-identifiable error so the UI can catch it and display confirmation instruction
    throw new Error('CONFIRMATION_PENDING: Verification email sent! Please check your inbox to confirm your account.');
  }

  return {
    id: data.user.id,
    email: data.user.email || cleanEmail,
    name: data.user.user_metadata?.name || name.trim(),
  };
}

/**
 * Sign in with OAuth using Supabase
 */
export async function signInWithOAuth(provider: 'google' | 'github'): Promise<AuthUser> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Please supply environment variables first.');
  }

  const redirectUrl = Linking.createURL('/', { scheme: 'expensetracker' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.url) {
    throw new Error(`Failed to initiate OAuth flow for ${provider}.`);
  }

  // Open in-app web browser
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type === 'success' && result.url) {
    const params = getParamsFromUrl(result.url);
    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;

    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error(userError?.message || 'Could not retrieve user profile.');
      }

      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.user_metadata?.full_name || 'OAuth User',
        vaultCombination: user.user_metadata?.vault_combination,
      };
    }
  }

  throw new Error('Sign in was cancelled or verification failed.');
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log(`Password reset requested for local user (Mock): ${email}`);
    return;
  }

  const redirectUrl = Linking.createURL('/');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: redirectUrl,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Sends a 6-digit OTP code to the user's email for verification (requires internet)
 */
export async function sendOtpCode(email: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Vault reset requires internet.');
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: false, // Don't sign up new users during vault reset
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Verifies the 6-digit OTP code entered by the user (requires internet)
 */
export async function verifyOtpCode(email: string, token: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Vault reset requires internet.');
  }

  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });

  if (error) {
    throw new Error(error.message);
  }
}
