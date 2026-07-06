import { useState, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useVault } from '@/context/vault-context';
import { syncManager } from '@/db/sync';

export interface Transaction {
  id: string;
  type: 'expense' | 'income';
  category: string;
  amount: number;
  date: string; // ISO format YYYY-MM-DD
  description?: string;
  accountName?: string;
  categoryIcon?: string;
  categoryColor?: string;
}


let currentMonthIndex = new Date().getMonth(); // Default to current month
let globalTxs: Transaction[] = [];

const monthListeners = new Set<(index: number) => void>();
const transactionListeners = new Set<(txs: Transaction[]) => void>();

export function useTransactions() {
  const db = useSQLiteContext();
  const { currentAccount } = useVault();
  
  // Use currentAccount ID if logged in, fallback to mock user for sandbox
  const userId = currentAccount?.id || 'mock-user-id';

  const [month, setMonth] = useState(currentMonthIndex);
  const [txs, setTxs] = useState<Transaction[]>(globalTxs);

  const loadTransactions = async () => {
    try {
      // Ensure the active user exists in SQLite users table to satisfy foreign key constraints
      const userExists = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM users WHERE id = ?',
        userId
      );
      if (!userExists) {
        console.log(`User ${userId} not found in SQLite. Synced user to SQLite database...`);
        let userName = 'Default User';
        let userEmail = 'default@example.com';
        if (currentAccount) {
          userName = currentAccount.name;
          userEmail = currentAccount.email;
        } else if (userId === 'mock-user-id') {
          userName = 'Sandbox User';
          userEmail = 'sandbox@c-vault.com';
        }
        await db.runAsync(
          "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, '')",
          userId,
          userName,
          userEmail
        );
      }

      // Seeding has been removed to allow a clean slate for accounts and transactions.

      // 2. Query transactions from SQLite
      const rows = await db.getAllAsync<{
        id: string;
        type: 'expense' | 'income';
        amount: number;
        date: string;
        description: string | null;
        category: string;
        accountName: string;
        categoryIcon: string | null;
        categoryColor: string | null;
      }>(
        `SELECT 
          t.id, 
          t.type, 
          t.amount, 
          t.transaction_date AS date, 
          t.description, 
          COALESCE(c.name, 'Other') AS category, 
          c.icon AS categoryIcon,
          c.color AS categoryColor,
          COALESCE(a.name, 'Cash') AS accountName
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = ? AND t.is_deleted = 0
        ORDER BY t.transaction_date DESC, t.updated_at DESC`,
        userId
      );

      const parsedTxs: Transaction[] = rows.map(r => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        date: r.date,
        description: r.description || undefined,
        category: r.category,
        accountName: r.accountName,
        categoryIcon: r.categoryIcon || undefined,
        categoryColor: r.categoryColor || undefined,
      }));

      globalTxs = parsedTxs;
      setTxs(parsedTxs);
      transactionListeners.forEach((listener) => listener(parsedTxs));
    } catch (err) {
      console.error('Error fetching transactions from SQLite:', err);
    }
  };

  useEffect(() => {
    const onMonthChange = (index: number) => setMonth(index);
    const onTxsChange = (newTxs: Transaction[]) => setTxs(newTxs);

    monthListeners.add(onMonthChange);
    transactionListeners.add(onTxsChange);

    // Initial load
    loadTransactions();

    return () => {
      monthListeners.delete(onMonthChange);
      transactionListeners.delete(onTxsChange);
    };
  }, [userId]);

  const setSharedMonth = (index: number) => {
    currentMonthIndex = index;
    monthListeners.forEach((listener) => listener(index));
  };

  const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
    try {
      const newTxId = Math.random().toString(36).substring(2, 9);

      // 1. Resolve Category ID
      let categoryId = 'cat-sys-food';
      const categoryNameLower = tx.category.toLowerCase().trim();
      const catRow = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM categories WHERE (user_id IS NULL OR user_id = ?) AND LOWER(name) = ?',
        userId,
        categoryNameLower
      );
      if (catRow) {
        categoryId = catRow.id;
      } else {
        // Dynamic category creation if not found
        const newCatId = 'cat-usr-' + Math.random().toString(36).substring(2, 9);
        await db.runAsync(
          "INSERT INTO categories (id, user_id, name, icon, color, type, sync_status) VALUES (?, ?, ?, 'receipt', '#6B7B77', ?, 'pending')",
          newCatId,
          userId,
          tx.category,
          tx.type
        );
        categoryId = newCatId;
      }

      // 2. Resolve Account ID
      let accountId = 'acc-untitled';
      const accountNameTrimmed = (tx.accountName || 'Untitled').trim();
      const accRow = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM accounts WHERE user_id = ? AND LOWER(name) = ?',
        userId,
        accountNameTrimmed.toLowerCase()
      );
      if (accRow) {
        accountId = accRow.id;
      } else {
        // Dynamic account creation if not found
        const newAccId = 'acc-usr-' + Math.random().toString(36).substring(2, 9);
        await db.runAsync(
          "INSERT INTO accounts (id, user_id, name, type, balance, sync_status) VALUES (?, ?, ?, 'checking', 0.0, 'pending')",
          newAccId,
          userId,
          accountNameTrimmed
        );
        accountId = newAccId;
      }

      // 3. Write into SQLite
      await db.runAsync(
        `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, description, transaction_date, sync_status, is_deleted, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, datetime('now'))`,
        newTxId,
        userId,
        accountId,
        categoryId,
        tx.type,
        tx.amount,
        tx.description ?? null,
        tx.date
      );

      // 4. Update the account's balance
      const balanceAdjustment = tx.type === 'income' ? tx.amount : -tx.amount;
      await db.runAsync(
        "UPDATE accounts SET balance = balance + ?, sync_status = 'pending', updated_at = datetime('now') WHERE id = ?",
        balanceAdjustment,
        accountId
      );

      // Reload databases to update state across components
      await loadTransactions();

      // Trigger cloud synchronizer
      syncManager.pushAll(userId).catch((err: any) => {
        console.warn('Background sync warning:', err);
      });
    } catch (err) {
      console.error('Error inserting transaction:', err);
    }
  };

  const deleteTransaction = async (tx: Transaction) => {
    try {
      const balanceAdjustment = tx.type === 'income' ? -tx.amount : tx.amount;
      
      const accountNameTrimmed = (tx.accountName || 'Cash').trim();
      const accRow = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM accounts WHERE user_id = ? AND LOWER(name) = ?',
        userId,
        accountNameTrimmed.toLowerCase()
      );
      
      if (accRow) {
        await db.runAsync(
          "UPDATE accounts SET balance = balance + ?, sync_status = 'pending', updated_at = datetime('now') WHERE id = ?",
          balanceAdjustment,
          accRow.id
        );
      }

      await db.runAsync(
        "UPDATE transactions SET is_deleted = 1, sync_status = 'pending', updated_at = datetime('now') WHERE id = ?",
        tx.id
      );

      await loadTransactions();

      syncManager.pushAll(userId).catch((err: any) => {
        console.warn('Background sync warning:', err);
      });
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  return {
    currentMonthIndex: month,
    setCurrentMonthIndex: setSharedMonth,
    transactions: txs,
    addTransaction,
    deleteTransaction,
  };
}

