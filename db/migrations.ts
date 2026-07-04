import { type SQLiteDatabase } from 'expo-sqlite';

export async function runMigrations(db: SQLiteDatabase) {
  // Create migration table to track schema version
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_versions (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Get current schema version
  const result = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_versions'
  );
  const currentVersion = result?.version ?? 0;

  // List of migrations ordered by version number
  const migrations: Record<number, string[]> = {
    1: [
      // 1. Create Users Table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        vault_password TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );`,

      // 2. Create Accounts Table
      `CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('checking', 'savings', 'credit', 'cash')) DEFAULT 'checking',
        balance REAL DEFAULT 0.0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'failed')) DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, name)
      );`,

      // 3. Create Categories Table (user_id is NULLable for global default system categories)
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        type TEXT CHECK(type IN ('expense', 'income')) NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'failed')) DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, name)
      );`,

      // 4. Create Transactions Table
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        type TEXT CHECK(type IN ('expense', 'income')) NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        transaction_date TEXT NOT NULL, -- YYYY-MM-DD
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'failed')) DEFAULT 'pending',
        is_deleted INTEGER DEFAULT 0, -- 0 = active, 1 = deleted
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
      );`,

      // 5. Create Budgets Table
      `CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        monthly_limit REAL NOT NULL,
        month INTEGER CHECK(month BETWEEN 1 AND 12) NOT NULL,
        year INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'failed')) DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
        UNIQUE(user_id, category_id, month, year)
      );`,

      // 6. Create Settings Table
      `CREATE TABLE IF NOT EXISTS settings (
        user_id TEXT PRIMARY KEY NOT NULL,
        theme TEXT CHECK(theme IN ('light', 'dark', 'system')) DEFAULT 'system',
        currency TEXT DEFAULT 'USD',
        biometric_enabled INTEGER DEFAULT 0,
        notifications_enabled INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );`
    ]
  };

  const targetVersions = Object.keys(migrations)
    .map(Number)
    .filter((v) => v > currentVersion)
    .sort((a, b) => a - b);

  try {
    for (const version of targetVersions) {
      console.log(`Applying database migration version ${version}...`);
      const sqlStatements = migrations[version];
      for (const sql of sqlStatements) {
        try {
          await db.execAsync(sql);
        } catch (sqlErr) {
          console.error(`Migration error executing SQL:\n${sql}\n`, sqlErr);
          throw sqlErr;
        }
      }
      await db.runAsync('INSERT INTO schema_versions (version) VALUES (?)', version);
      console.log(`Database migration version ${version} applied successfully.`);
    }
  } catch (err) {
    console.error('Fatal error during database migrations:', err);
    throw err;
  }
}
