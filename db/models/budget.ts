export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
  month: number; // 1-12
  year: number;
  created_at?: string;
  updated_at?: string;
  sync_status?: 'pending' | 'synced' | 'failed';
}
