import { useState, useEffect } from 'react';

export interface Transaction {
  id: string;
  type: 'expense' | 'income';
  category: string;
  amount: number;
  date: string; // ISO format YYYY-MM-DD
  description?: string;
  accountName?: string;
}

// Initial mock transactions (mostly in June 2026 for demonstration, index 5)
const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'expense',
    category: 'Rent',
    amount: 150.00,
    date: '2026-06-25',
    description: 'June studio apartment rent portion',
    accountName: 'Savings',
  },
  {
    id: '2',
    type: 'expense',
    category: 'Food',
    amount: 300.00,
    date: '2026-06-27',
    description: 'Weekly grocery shopping',
    accountName: 'Untitled',
  },
  {
    id: '3',
    type: 'expense',
    category: 'Food',
    amount: 150.00,
    date: '2026-06-10',
    description: 'Dinner with friends',
    accountName: 'Savings',
  },
  {
    id: '4',
    type: 'expense',
    category: 'Transport',
    amount: 180.00,
    date: '2026-06-14',
    description: 'Monthly train pass ticket',
    accountName: 'Savings',
  },
  {
    id: '5',
    type: 'expense',
    category: 'Leisure',
    amount: 120.00,
    date: '2026-06-20',
    description: 'Movie night and snacks',
    accountName: 'Untitled',
  },
  {
    id: '6',
    type: 'income',
    category: 'Salary',
    amount: 2800.00,
    date: '2026-06-01',
    description: 'Main salary deposit',
    accountName: 'Savings',
  },
  {
    id: '7',
    type: 'income',
    category: 'Freelance',
    amount: 450.00,
    date: '2026-06-15',
    description: 'Web development freelance project',
    accountName: 'Untitled',
  },
  {
    id: '8',
    type: 'income',
    category: 'Investments',
    amount: 150.00,
    date: '2026-06-20',
    description: 'Dividend payment',
    accountName: 'Savings',
  },
];

let currentMonthIndex = 5; // Default to June (index 5)
let transactions = [...INITIAL_TRANSACTIONS];

const monthListeners = new Set<(index: number) => void>();
const transactionListeners = new Set<(txs: Transaction[]) => void>();

export function useTransactions() {
  const [month, setMonth] = useState(currentMonthIndex);
  const [txs, setTxs] = useState<Transaction[]>(transactions);

  useEffect(() => {
    const onMonthChange = (index: number) => setMonth(index);
    const onTxsChange = (newTxs: Transaction[]) => setTxs(newTxs);

    monthListeners.add(onMonthChange);
    transactionListeners.add(onTxsChange);

    return () => {
      monthListeners.delete(onMonthChange);
      transactionListeners.delete(onTxsChange);
    };
  }, []);

  const setSharedMonth = (index: number) => {
    currentMonthIndex = index;
    monthListeners.forEach((listener) => listener(index));
  };

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: Math.random().toString(36).substring(2, 9),
    };
    transactions = [newTx, ...transactions];
    transactionListeners.forEach((listener) => listener(transactions));
  };

  return {
    currentMonthIndex: month,
    setCurrentMonthIndex: setSharedMonth,
    transactions: txs,
    addTransaction,
  };
}
