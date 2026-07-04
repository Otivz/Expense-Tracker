import { type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { setDatabaseInstance } from './database';
import { runMigrations } from './migrations';

export async function initializeDatabase(db: SQLiteDatabase) {
  // Save database connection instance for repositories
  setDatabaseInstance(db);

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Web-only: Clean force reset once to clear stale schemas from earlier development
  if (Platform.OS === 'web') {
    const RESET_FLAG = 'cvault_db_force_reset_v8';
    if (!localStorage.getItem(RESET_FLAG)) {
      console.log('Performing one-time clean database reset on web to resolve schema drift...');
      try {
        await db.execAsync('PRAGMA foreign_keys = OFF;');
        await db.execAsync('DROP TABLE IF EXISTS budgets;');
        await db.execAsync('DROP TABLE IF EXISTS transactions;');
        await db.execAsync('DROP TABLE IF EXISTS categories;');
        await db.execAsync('DROP TABLE IF EXISTS accounts;');
        await db.execAsync('DROP TABLE IF EXISTS settings;');
        await db.execAsync('DROP TABLE IF EXISTS users;');
        await db.execAsync('DROP TABLE IF EXISTS schema_versions;');
        await db.execAsync('PRAGMA foreign_keys = ON;');
        localStorage.setItem(RESET_FLAG, 'true');
        console.log('Web database clean reset completed.');
      } catch (err) {
        console.error('Failed to force reset web database:', err);
      }
    }
  }

  // Self-healing database reset if database schema or initial data is outdated/stale
  try {
    let shouldReset = false;

    // Check 1: Check for is_deleted column in transactions table
    const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transactions);');
    if (tableInfo.length > 0) {
      const hasIsDeleted = tableInfo.some(col => col.name === 'is_deleted');
      if (!hasIsDeleted) {
        console.log('Stale schema detected (missing is_deleted).');
        shouldReset = true;
      }
    }

    // Check 2: Check for global system default categories (which we want to wipe)
    try {
      const defaultCats = await db.getAllAsync<{ id: string }>('SELECT id FROM categories WHERE id LIKE "cat-sys-%"');
      if (defaultCats.length > 0) {
        console.log('Stale default system categories detected.');
        shouldReset = true;
      }
    } catch (e) {
      // categories table might not exist yet, which is fine
    }

    if (shouldReset) {
      console.log('Resetting database to apply migrations clean...');
      await db.execAsync('PRAGMA foreign_keys = OFF;');
      await db.execAsync('DROP TABLE IF EXISTS budgets;');
      await db.execAsync('DROP TABLE IF EXISTS transactions;');
      await db.execAsync('DROP TABLE IF EXISTS categories;');
      await db.execAsync('DROP TABLE IF EXISTS accounts;');
      await db.execAsync('DROP TABLE IF EXISTS settings;');
      await db.execAsync('DROP TABLE IF EXISTS users;');
      await db.execAsync('DROP TABLE IF EXISTS schema_versions;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      console.log('Database schema successfully reset.');
    }
  } catch (err) {
    console.error('Error during database schema checks:', err);
  }

  // Run all migrations to establish tables
  await runMigrations(db);
}
