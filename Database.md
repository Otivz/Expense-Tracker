# Database Schema Completion & Migration Plan

This document outlines the design and implementation plan to complete the SQLite schema database for the **C-Vault** application.

---

## 1. Schema Overview

Below is the entity-relationship mapping of the completed SQLite database schema. It consists of existing tables and new extensions (marked as `[NEW]` or `[MODIFIED]`).

```mermaid
erDiagram
    users ||--o{ accounts : owns
    users ||--o{ categories : customizes
    users ||--o{ transactions : logs
    users ||--o{ budgets : sets
    users ||--o{ savings_goals : tracks
    users ||--|| settings : configures
    
    accounts ||--o{ transactions : source
    categories ||--o{ transactions : type
    categories ||--o{ budgets : limit
    
    users {
        string id PK
        string name
        string email
        string password
        string vault_password
        string created_at
        string updated_at
    }
    
    accounts {
        string id PK
        string user_id FK
        string name
        string type
        string icon " [NEW] 'cash' | 'card' | 'piggybank' | 'visa'"
        string color " [NEW]"
        real balance
        string created_at
        string updated_at
        string sync_status
    }
    
    categories {
        string id PK
        string user_id FK "Nullable"
        string name
        string icon
        string color
        string type "'expense' | 'income'"
        string created_at
        string updated_at
        string sync_status
    }
    
    transactions {
        string id PK
        string user_id FK
        string account_id FK
        string category_id FK
        string type "'expense' | 'income'"
        real amount
        string description
        string transaction_date
        string created_at
        string updated_at
        string sync_status
        integer is_deleted
    }
    
    budgets {
        string id PK
        string user_id FK
        string category_id FK
        real monthly_limit
        integer month "1-12"
        integer year
        string created_at
        string updated_at
        string sync_status
    }
    
    savings_goals {
        string id PK " [NEW]"
        string user_id FK " [NEW]"
        string name " [NEW]"
        real target_amount " [NEW]"
        real current_amount " [NEW]"
        string target_date " [NEW] YYYY-MM-DD"
        string created_at " [NEW]"
        string updated_at " [NEW]"
        string sync_status " [NEW]"
        integer is_deleted " [NEW]"
    }
    
    settings {
        string user_id PK FK
        string theme "'light' | 'dark' | 'system'"
        string currency "e.g. 'PHP', 'USD'"
        integer biometric_enabled "0 or 1"
        integer notifications_enabled "0 or 1"
        string updated_at
    }
```

---

## 2. Migration Plan (Version 2)

To upgrade the existing SQLite database without losing user data, we will add a new database migration block (version `2`) in [migrations.ts](file:///c:/Users/User/Desktop/expense-tracker/db/migrations.ts).

### Migration SQL Statements
```sql
-- 1. Modify Accounts Table (Add Icon and Color columns)
ALTER TABLE accounts ADD COLUMN icon TEXT DEFAULT 'cash';
ALTER TABLE accounts ADD COLUMN color TEXT DEFAULT '#0D8A63';

-- 2. Create Savings Goals Table
CREATE TABLE IF NOT EXISTS savings_goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL DEFAULT 0.0,
  target_date TEXT, -- YYYY-MM-DD
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'failed')) DEFAULT 'pending',
  is_deleted INTEGER DEFAULT 0, -- 0 = active, 1 = deleted
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

---

## 3. TypeScript Models

We will update existing model files and create new models to represent the database records.

### A. Modify Account Model
File: [account.ts](file:///c:/Users/User/Desktop/expense-tracker/db/models/account.ts)
```typescript
export interface Account {
  id: string;
  user_id: string;
  name: string;
  type?: 'checking' | 'savings' | 'credit' | 'cash';
  icon?: string; // 'cash' | 'card' | 'piggybank' | 'visa' [NEW]
  color?: string; // Hex code [NEW]
  balance: number;
  created_at?: string;
  updated_at?: string;
  sync_status?: 'pending' | 'synced' | 'failed';
}
```

### B. New Savings Goal Model [NEW]
File: [savingsGoal.ts](file:///c:/Users/User/Desktop/expense-tracker/db/models/savingsGoal.ts)
```typescript
export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string; // YYYY-MM-DD
  created_at?: string;
  updated_at?: string;
  sync_status?: 'pending' | 'synced' | 'failed';
  is_deleted?: number; // 0 or 1
}
```

---

## 4. Repository Layer Implementations

We will create three new repositories inside `db/repositories/` to handle CRUD operations.

### A. Budget Repository [NEW]
File: `db/repositories/budgetRepository.ts`
- `getAll(userId: string)`: Fetch all budget rules.
- `getByCategory(userId: string, categoryId: string, month: number, year: number)`: Get budget limit for a specific category.
- `insert(budget: Budget)`: Create a new budget rule.
- `update(budget: Budget)`: Update budget limit.
- `delete(id: string)`: Delete a budget rule.

### B. Settings Repository [NEW]
File: `db/repositories/settingsRepository.ts`
- `get(userId: string)`: Fetch user settings.
- `upsert(settings: Settings)`: Insert or update user theme, currency, biometric, and notification options.

### C. Savings Goal Repository [NEW]
File: `db/repositories/savingsGoalRepository.ts`
- `getAll(userId: string)`: Fetch active savings goals.
- `insert(goal: SavingsGoal)`: Add a savings goal.
- `updateProgress(id: string, amount: number)`: Add/deduct money from a savings goal.
- `delete(id: string)`: Soft-delete a savings goal.

---

## 5. UI Integration Plan (Data Binding)

We will connect the screen files to retrieve and persist database values using the SQLite instance:

1. **Accounts Screen**: Update state initialization to load active accounts using `accountRepository` (or the SQLite proxy `db`) instead of static component state arrays.
2. **Budgets Screen**: Query active budgets from the SQLite database via the new `budgetRepository`.
3. **Categories Screen**: Read system categories and custom user-created categories directly from the `categories` table via `categoryRepository`.
