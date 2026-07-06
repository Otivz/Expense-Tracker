import { db } from './database';
import { isSupabaseConfigured, supabase } from '../utils/supabase';
import { Platform } from 'react-native';
import { sha256 } from '@/utils/hash';
import * as SecureStore from 'expo-secure-store';

// ─── Helper ─────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

// ─── Sync Manager ────────────────────────────────────────────────────────────

export const syncManager = {
  isSyncing: false,

  // ── Get active session, refreshing if needed ──────────────────────────────
  async _getSession() {
    if (!supabase) return null;
    // First try getting existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;
    // Session expired — try refreshing it
    console.log('[Sync] Session expired, attempting refresh...');
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed?.session) {
      console.log('[Sync] Session refreshed successfully.');
      return refreshed.session;
    }
    return null;
  },

  // ── PUSH: send all pending local changes up to Supabase ──────────────────

  async pushAll(userId: string): Promise<void> {
    if (this.isSyncing) return;
    if (!isSupabaseConfigured || !supabase) return;

    // Guard: verify active session matches userId
    const session = await this._getSession();
    if (!session || session.user.id !== userId) {
      console.warn('[Sync] pushAll skipped: no valid session for user', userId);
      return;
    }

    this.isSyncing = true;
    console.log('[Sync] Pushing local changes to Supabase...');

    try {
      await this._pushTransactions(userId);
      await this._pushAccounts(userId);
      await this._pushCategories(userId);
      await this._pushBudgets(userId);
      console.log('[Sync] Push complete.');
    } catch (err) {
      console.error('[Sync] Push failed:', err);
    } finally {
      this.isSyncing = false;
    }
  },

  // ── FORCE SYNC: mark ALL existing local data as pending and push ──────────

  async forceSyncAll(userId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      console.log('[Sync] Skipped: Supabase not configured.');
      return;
    }

    // Try to get or refresh session
    const session = await this._getSession();
    if (!session || session.user.id !== userId) {
      console.warn('[Sync] Skipped: No valid Supabase session for user', userId);
      console.warn('[Sync] auth.uid():', session?.user.id ?? 'none', '| local userId:', userId);
      console.warn('[Sync] To fix: remove this vault account and sign in again to establish a fresh session.');
      return;
    }

    console.log('[Sync] Force-marking all local data as pending...');
    await db.runAsync("UPDATE transactions SET sync_status = 'pending' WHERE user_id = ? AND is_deleted = 0", userId);
    await db.runAsync("UPDATE accounts SET sync_status = 'pending' WHERE user_id = ?", userId);
    await db.runAsync("UPDATE categories SET sync_status = 'pending' WHERE user_id = ?", userId);
    await db.runAsync("UPDATE budgets SET sync_status = 'pending' WHERE user_id = ?", userId);
    console.log('[Sync] All records marked pending. Pushing...');
    await this.pushAll(userId);
    console.log('[Sync] Force sync complete.');
  },

  async _pushTransactions(userId: string): Promise<void> {
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM transactions WHERE user_id = ? AND sync_status = 'pending'",
      userId
    );
    for (const tx of rows) {
      const { error } = await supabase!.from('transactions').upsert({
        id: tx.id,
        user_id: tx.user_id,
        account_id: tx.account_id,
        category_id: tx.category_id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        transaction_date: tx.transaction_date,
        is_deleted: tx.is_deleted ?? 0,
        updated_at: tx.updated_at ?? now(),
        // NOTE: sync_status is local-only, not sent to Supabase
      });
      if (error) {
        console.error('[Sync] Transaction push error:', error.message);
      } else {
        if (tx.is_deleted === 1) {
          await db.runAsync('DELETE FROM transactions WHERE id = ?', tx.id);
        } else {
          await db.runAsync("UPDATE transactions SET sync_status = 'synced' WHERE id = ?", tx.id);
        }
      }
    }
  },


  async _pushAccounts(userId: string): Promise<void> {
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM accounts WHERE user_id = ? AND sync_status = 'pending'",
      userId
    );
    for (const acc of rows) {
      const { error } = await supabase!.from('accounts').upsert({
        id: acc.id,
        user_id: acc.user_id,
        name: acc.name,
        type: acc.type,
        balance: acc.balance,
        updated_at: acc.updated_at ?? now(),
      });
      if (error) {
        console.error('[Sync] Account push error:', error.message);
      } else {
        await db.runAsync("UPDATE accounts SET sync_status = 'synced' WHERE id = ?", acc.id);
      }
    }
  },

  async _pushCategories(userId: string): Promise<void> {
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM categories WHERE user_id = ? AND sync_status = 'pending'",
      userId
    );
    for (const cat of rows) {
      const { error } = await supabase!.from('categories').upsert({
        id: cat.id,
        user_id: cat.user_id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        updated_at: cat.updated_at ?? now(),
      });
      if (error) {
        console.error('[Sync] Category push error:', error.message);
      } else {
        await db.runAsync("UPDATE categories SET sync_status = 'synced' WHERE id = ?", cat.id);
      }
    }
  },

  async _pushBudgets(userId: string): Promise<void> {
    const rows = await db.getAllAsync<any>(
      `SELECT b.*, c.name as category_name 
       FROM budgets b 
       LEFT JOIN categories c ON b.category_id = c.id 
       WHERE b.user_id = ? AND b.sync_status = 'pending'`,
      userId
    );
    for (const bud of rows) {
      if (!bud.category_name) {
        console.warn('[Sync] Skipping budget with missing category:', bud.id);
        continue;
      }
      const payload = {
        id: bud.id,
        user_id: bud.user_id,
        category: bud.category_name,
        limit_amount: bud.monthly_limit,
        month: bud.month,
        year: bud.year,
        updated_at: bud.updated_at ?? now(),
      };
      const { error } = await supabase!.from('budgets').upsert(payload);
      if (error) {
        console.error('[Sync] Budget push error:', error.message, '| code:', error.code, '| details:', error.details);
      } else {
        await db.runAsync("UPDATE budgets SET sync_status = 'synced' WHERE id = ?", bud.id);
      }
    }
  },

  // ── PULL: download all cloud data into local SQLite on new device login ──

  async pullAll(userId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    console.log('[Sync] Pulling data from Supabase...');
    try {
      // Get latest user metadata to pull any changed vault combination
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.user_metadata?.vault_combination && Array.isArray(user.user_metadata.vault_combination)) {
        const combination = user.user_metadata.vault_combination;
        const comboString = combination.join(',');
        const hash = sha256(comboString);
        
        const COMBINATION_PREFIX = 'cvault_combination_';
        if (Platform.OS === 'web') {
          localStorage.setItem(`${COMBINATION_PREFIX}${userId}`, hash);
          for (let i = 1; i <= 4; i++) {
            const subCombo = combination.slice(0, i).join(',');
            const stepHash = sha256(subCombo);
            localStorage.setItem(`${COMBINATION_PREFIX}${userId}_step_${i}`, stepHash);
          }
        } else {
          await SecureStore.setItemAsync(`${COMBINATION_PREFIX}${userId}`, hash);
          for (let i = 1; i <= 4; i++) {
            const subCombo = combination.slice(0, i).join(',');
            const stepHash = sha256(subCombo);
            await SecureStore.setItemAsync(`${COMBINATION_PREFIX}${userId}_step_${i}`, stepHash);
          }
        }
        console.log('[Sync] Vault combination hash updated locally from Supabase user metadata.');
      }
    } catch (metaErr) {
      console.warn('[Sync] Failed to sync latest vault combination metadata:', metaErr);
    }

    try {
      await this._pullAccounts(userId);
      await this._pullCategories(userId);
      await this._pullTransactions(userId);
      await this._pullBudgets(userId);
      console.log('[Sync] Pull complete.');
    } catch (err) {
      console.error('[Sync] Pull failed:', err);
    }
  },

  async _pullAccounts(userId: string): Promise<void> {
    const { data, error } = await supabase!
      .from('accounts')
      .select('*')
      .eq('user_id', userId);
    if (error || !data) return;

    for (const acc of data) {
      const exists = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM accounts WHERE id = ?', acc.id
      );
      if (!exists) {
        await db.runAsync(
          `INSERT OR IGNORE INTO accounts (id, user_id, name, type, balance, sync_status, updated_at)
           VALUES (?, ?, ?, ?, ?, 'synced', ?)`,
          acc.id, userId, acc.name, acc.type, acc.balance ?? 0, acc.updated_at ?? now()
        );
      }
    }
  },

  async _pullCategories(userId: string): Promise<void> {
    const { data, error } = await supabase!
      .from('categories')
      .select('*')
      .eq('user_id', userId);
    if (error || !data) return;

    for (const cat of data) {
      const exists = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM categories WHERE id = ?', cat.id
      );
      if (!exists) {
        await db.runAsync(
          `INSERT OR IGNORE INTO categories (id, user_id, name, icon, color, type, sync_status, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'synced', ?)`,
          cat.id, userId, cat.name, cat.icon ?? null, cat.color ?? null,
          cat.type ?? 'expense', cat.updated_at ?? now()
        );
      }
    }
  },

  async _pullTransactions(userId: string): Promise<void> {
    const { data, error } = await supabase!
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', 0);
    if (error || !data) return;

    for (const tx of data) {
      const exists = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM transactions WHERE id = ?', tx.id
      );
      if (!exists) {
        await db.runAsync(
          `INSERT OR IGNORE INTO transactions
           (id, user_id, account_id, category_id, type, amount, description, transaction_date, sync_status, is_deleted, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0, ?)`,
          tx.id, userId, tx.account_id, tx.category_id ?? null,
          tx.type, tx.amount, tx.description ?? null,
          tx.transaction_date, tx.updated_at ?? now()
        );
      }
    }
  },

  async _pullBudgets(userId: string): Promise<void> {
    const { data, error } = await supabase!
      .from('budgets')
      .select('*')
      .eq('user_id', userId);
    if (error || !data) return;

    for (const bud of data) {
      // Resolve the category id from local categories by name
      const cat = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM categories WHERE LOWER(name) = ? AND (user_id = ? OR user_id IS NULL)',
        bud.category.toLowerCase(), userId
      );
      if (!cat) continue;

      const exists = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM budgets WHERE id = ?', bud.id
      );
      if (!exists) {
        await db.runAsync(
          `INSERT OR IGNORE INTO budgets (id, user_id, category_id, monthly_limit, month, year, sync_status, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'synced', ?)`,
          bud.id, userId, cat.id, bud.limit_amount, bud.month, bud.year, bud.updated_at ?? now()
        );
      }
    }
  },

  // ── FULL SYNC: push then pull ─────────────────────────────────────────────

  async syncAll(userId: string): Promise<void> {
    await this.pushAll(userId);
    await this.pullAll(userId);
  },
};
