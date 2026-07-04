export interface Account {
  id: string;
  user_id: string;
  name: string;
  type?: 'checking' | 'savings' | 'credit' | 'cash';
  balance: number;
  created_at?: string;
  updated_at?: string;
  sync_status?: 'pending' | 'synced' | 'failed';
}
