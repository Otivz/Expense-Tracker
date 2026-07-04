import { db } from '../database';
import { Category } from '../models/category';

export const categoryRepository = {
  // Fetch system global categories plus user specific categories
  async getAll(userId: string): Promise<Category[]> {
    return await db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY name ASC',
      userId
    );
  },

  async insert(category: Category): Promise<void> {
    await db.runAsync(
      `INSERT INTO categories (id, user_id, name, icon, color, type, sync_status, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      category.id,
      category.user_id,
      category.name,
      category.icon ?? null,
      category.color ?? null,
      category.type,
      category.sync_status ?? 'pending'
    );
  },

  async update(category: Category): Promise<void> {
    await db.runAsync(
      `UPDATE categories 
       SET name = ?, icon = ?, color = ?, type = ?, sync_status = ?, updated_at = datetime('now') 
       WHERE id = ?`,
      category.name,
      category.icon ?? null,
      category.color ?? null,
      category.type,
      category.sync_status ?? 'pending',
      category.id
    );
  },

  async delete(id: string): Promise<void> {
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  }
};
