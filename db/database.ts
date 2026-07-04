import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

// Database file name
export const DATABASE_NAME = 'cvault.db';

let activeDbInstance: SQLiteDatabase | null = null;
let dbPromise: Promise<SQLiteDatabase> | null = null;

export function setDatabaseInstance(database: SQLiteDatabase) {
  console.log('Database instance shared with repository layers.');
  activeDbInstance = database;
}

export async function getDbAsync(): Promise<SQLiteDatabase> {
  if (activeDbInstance) return activeDbInstance;
  
  // Wait up to 1500ms for activeDbInstance to be set by SQLiteProvider (onInit)
  // to avoid concurrent database connections which crash on web OPFS.
  for (let i = 0; i < 30; i++) {
    if (activeDbInstance) return activeDbInstance;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  if (activeDbInstance) return activeDbInstance;

  if (!dbPromise) {
    console.log('Lazy-opening database connection as fallback...');
    dbPromise = openDatabaseAsync(DATABASE_NAME).then(database => {
      activeDbInstance = database;
      return database;
    });
  }
  return dbPromise;
}

// Proxy object that intercepts database calls and resolves them asynchronously
export const db = new Proxy({} as SQLiteDatabase, {
  get(target, prop, receiver) {
    // Return a function that fetches the database async and then invokes the property
    return (...args: any[]) => {
      return getDbAsync().then(database => {
        const value = (database as any)[prop];
        if (typeof value === 'function') {
          return value.apply(database, args);
        }
        return value;
      });
    };
  }
});
