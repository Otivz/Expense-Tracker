export interface Settings {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  currency: string;
  biometric_enabled: number; // 0 = false, 1 = true
  notifications_enabled: number; // 0 = false, 1 = true
  updated_at?: string;
}
