import { db } from '../database';
import { User } from '../models/user';

export const userRepository = {
  async getByEmail(email: string): Promise<User | null> {
    return await db.getFirstAsync<User>(
      'SELECT * FROM users WHERE email = ?',
      email.toLowerCase().trim()
    );
  },

  async getById(id: string): Promise<User | null> {
    return await db.getFirstAsync<User>(
      'SELECT * FROM users WHERE id = ?',
      id
    );
  },

  async insert(user: User): Promise<void> {
    await db.runAsync(
      `INSERT INTO users (id, name, email, password, vault_password, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      user.id,
      user.name,
      user.email.toLowerCase().trim(),
      user.password || '',
      user.vault_password ?? null
    );
  },

  async updateVaultPassword(id: string, hashedCombo: string): Promise<void> {
    await db.runAsync(
      "UPDATE users SET vault_password = ?, updated_at = datetime('now') WHERE id = ?",
      hashedCombo,
      id
    );
  },

  async delete(id: string): Promise<void> {
    await db.runAsync('DELETE FROM users WHERE id = ?', id);
  }
};
