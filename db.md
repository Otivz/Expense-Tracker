-- 1. Create the transactions table in the public schema
create table public.transactions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id text not null,
  category_id text,
  type text check (type in ('expense', 'income')) not null,
  amount numeric not null,
  description text,
  transaction_date text,
  is_deleted integer default 0,
  updated_at text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS) to keep user data private
alter table public.transactions enable row level security;

-- 3. Create a security policy allowing users to only access and modify their own records
create policy "Users can modify their own transactions"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
