export interface Category {
  id: string;
  user_id: string | null; // NULL for global system default categories
  name: string;
  icon?: string;
  color?: string;
  type: 'expense' | 'income';
  created_at?: string;
  updated_at?: string;
  sync_status?: 'pending' | 'synced' | 'failed';
}
