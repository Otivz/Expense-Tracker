import { db } from '../database';
import { Transaction } from '../models/transaction';

export const transactionRepository = {
  async getAll(userId: string): Promise<Transaction[]> {
    return await db.getAllAsync<Transaction>(
      'SELECT * FROM transactions WHERE user_id = ? AND is_deleted = 0 ORDER BY transaction_date DESC, updated_at DESC',
      userId
    );
  },

  async getById(id: string): Promise<Transaction | null> {
    return await db.getFirstAsync<Transaction>(
      'SELECT * FROM transactions WHERE id = ? AND is_deleted = 0',
      id
    );
  },

  async insert(tx: Transaction): Promise<void> {
    await db.runAsync(
      `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, description, transaction_date, sync_status, is_deleted, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
      tx.id,
      tx.user_id,
      tx.account_id,
      tx.category_id,
      tx.type,
      tx.amount,
      tx.description ?? null,
      tx.transaction_date,
      tx.sync_status ?? 'pending'
    );
  },

  async update(tx: Transaction): Promise<void> {
    await db.runAsync(
      `UPDATE transactions 
       SET account_id = ?, category_id = ?, type = ?, amount = ?, description = ?, transaction_date = ?, sync_status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      tx.account_id,
      tx.category_id,
      tx.type,
      tx.amount,
      tx.description ?? null,
      tx.transaction_date,
      tx.sync_status ?? 'pending',
      tx.id
    );
  },

  // Soft delete for sync reconciliation
  async delete(id: string): Promise<void> {
    await db.runAsync(
      "UPDATE transactions SET is_deleted = 1, sync_status = 'pending', updated_at = datetime('now') WHERE id = ?",
      id
    );
  },

  async hardDelete(id: string): Promise<void> {
    await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
  },

  async getPendingSync(userId: string): Promise<Transaction[]> {
    return await db.getAllAsync<Transaction>(
      "SELECT * FROM transactions WHERE user_id = ? AND sync_status = 'pending'",
      userId
    );
  },

  async markAsSynced(id: string): Promise<void> {
    await db.runAsync(
      "UPDATE transactions SET sync_status = 'synced' WHERE id = ?",
      id
    );
  }
};
