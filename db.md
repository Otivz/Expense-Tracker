-- 1. TRANSACTIONS
create table if not exists public.transactions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id text not null,
  category_id text,
  type text check (type in ('expense', 'income')) not null,
  amount numeric not null,
  description text,
  transaction_date text,
  is_deleted integer default 0,
  sync_status text default 'pending',
  updated_at text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.transactions enable row level security;
drop policy if exists "Users can manage their own transactions" on public.transactions;
create policy "Users can manage their own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. ACCOUNTS
create table if not exists public.accounts (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text,
  balance numeric default 0,
  updated_at text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.accounts enable row level security;
drop policy if exists "Users can manage their own accounts" on public.accounts;
create policy "Users can manage their own accounts"
  on public.accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. CATEGORIES
create table if not exists public.categories (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  icon text,
  color text,
  type text,
  updated_at text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.categories enable row level security;
drop policy if exists "Users can manage their own categories" on public.categories;
create policy "Users can manage their own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. BUDGETS
create table if not exists public.budgets (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  limit_amount numeric not null,
  month integer not null,
  year integer not null,
  updated_at text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.budgets enable row level security;
drop policy if exists "Users can manage their own budgets" on public.budgets;
create policy "Users can manage their own budgets"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- Add sync_status column that was missing from the original transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS sync_status text default 'pending';
