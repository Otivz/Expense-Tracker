import { db } from '../database';
import { Account } from '../models/account';

export const accountRepository = {
  async getAll(userId: string): Promise<Account[]> {
    return await db.getAllAsync<Account>(
      'SELECT * FROM accounts WHERE user_id = ? ORDER BY name ASC',
      userId
    );
  },

  async insert(account: Account): Promise<void> {
    await db.runAsync(
      `INSERT INTO accounts (id, user_id, name, type, balance, sync_status, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      account.id,
      account.user_id,
      account.name,
      account.type ?? null,
      account.balance,
      account.sync_status ?? 'pending'
    );
  },

  async updateBalance(id: string, newBalance: number): Promise<void> {
    await db.runAsync(
      "UPDATE accounts SET balance = ?, sync_status = 'pending', updated_at = datetime('now') WHERE id = ?",
      newBalance,
      id
    );
  },

  async update(account: Account): Promise<void> {
    await db.runAsync(
      `UPDATE accounts 
       SET name = ?, type = ?, balance = ?, sync_status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      account.name,
      account.type ?? null,
      account.balance,
      account.sync_status ?? 'pending',
      account.id
    );
  },

  async delete(id: string): Promise<void> {
    await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
  }
};
