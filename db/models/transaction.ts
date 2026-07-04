export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: 'expense' | 'income';
  amount: number;
  description?: string;
  transaction_date: string; // YYYY-MM-DD
  created_at?: string;
  updated_at?: string;
  sync_status?: 'pending' | 'synced' | 'failed';
  is_deleted?: number; // 0 = active, 1 = deleted
}
