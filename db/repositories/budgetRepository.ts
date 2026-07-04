import { db } from '../database';

export interface BudgetDB {
  id: string;
  category: string;
  limit: number;
}

export const budgetRepository = {
  // Fetch budgets for user in a specific month & year
  async getAll(userId: string, month: number, year: number): Promise<BudgetDB[]> {
    return await db.getAllAsync<BudgetDB>(
      `SELECT b.id, c.name as category, b.monthly_limit as "limit"
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? AND b.month = ? AND b.year = ?`,
      userId,
      month,
      year
    );
  },

  // Insert or update budget for a category, month, and year
  async upsert(userId: string, categoryName: string, limit: number, month: number, year: number): Promise<void> {
    // 1. Resolve category ID
    const cat = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM categories WHERE LOWER(name) = ?',
      categoryName.toLowerCase()
    );
    if (!cat) {
      throw new Error(`Category "${categoryName}" not found in database.`);
    }

    // 2. Perform insert or update
    await db.runAsync(
      `INSERT INTO budgets (id, user_id, category_id, monthly_limit, month, year, sync_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
       ON CONFLICT(user_id, category_id, month, year) DO UPDATE SET
         monthly_limit = excluded.monthly_limit,
         sync_status = 'pending',
         updated_at = datetime('now')`,
      'bud-' + Math.random().toString(36).substring(2, 9),
      userId,
      cat.id,
      limit,
      month,
      year
    );
  },

  // Delete budget by category name, month, and year
  async delete(userId: string, categoryName: string, month: number, year: number): Promise<void> {
    const cat = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM categories WHERE LOWER(name) = ?',
      categoryName.toLowerCase()
    );
    if (!cat) return;

    await db.runAsync(
      'DELETE FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
      userId,
      cat.id,
      month,
      year
    );
  }
};
