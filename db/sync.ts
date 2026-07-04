import { transactionRepository } from './repositories/transactionRepository';
import { isSupabaseConfigured, supabase } from '../utils/supabase';

export const syncManager = {
  isSyncing: false,

  async syncTransactions(userId: string): Promise<void> {
    if (this.isSyncing) return;
    if (!isSupabaseConfigured || !supabase) {
      console.log('Sync skipped: Supabase is not configured.');
      return;
    }

    this.isSyncing = true;
    console.log('Starting transaction synchronization...');

    try {
      // Get all local transactions that need syncing
      const pendingTxs = await transactionRepository.getPendingSync(userId);
      
      if (pendingTxs.length === 0) {
        console.log('No pending transactions to sync.');
        this.isSyncing = false;
        return;
      }

      for (const tx of pendingTxs) {
        const { error } = await supabase
          .from('transactions')
          .upsert({
            id: tx.id,
            user_id: tx.user_id,
            account_id: tx.account_id,
            category_id: tx.category_id,
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            transaction_date: tx.transaction_date,
            is_deleted: tx.is_deleted ?? 0,
            updated_at: tx.updated_at
          });

        if (error) {
          console.error(`Failed to sync transaction ${tx.id}:`, error.message);
        } else {
          // If the record was soft deleted, we can hard-delete locally after a successful cloud sync
          if (tx.is_deleted === 1) {
            await transactionRepository.hardDelete(tx.id);
          } else {
            await transactionRepository.markAsSynced(tx.id);
          }
          console.log(`Synced transaction: ${tx.id}`);
        }
      }
    } catch (error) {
      console.error('Error during transaction sync:', error);
    } finally {
      this.isSyncing = false;
      console.log('Transaction synchronization process finished.');
    }
  }
};
