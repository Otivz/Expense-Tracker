import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { useTransactions } from '@/hooks/useTransactions';
import { useTheme } from '@/context/theme-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useVault } from '@/context/vault-context';

interface AccountsSummaryProps {
  totalBalance?: number;
}

export function AccountsSummary({ totalBalance: propTotalBalance }: AccountsSummaryProps) {
  const { currentMonthIndex, transactions } = useTransactions();
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const { currentAccount } = useVault();
  const userId = currentAccount?.id || 'mock-user-id';

  const [dbTotalBalance, setDbTotalBalance] = useState<number | null>(null);

  useEffect(() => {
    // Only load dynamic balance from SQLite if propTotalBalance is not provided
    if (propTotalBalance === undefined) {
      const loadTotalBalance = async () => {
        try {
          const result = await db.getFirstAsync<{ total: number | null }>(
            'SELECT SUM(balance) as total FROM accounts WHERE user_id = ?',
            userId
          );
          if (result && result.total !== null) {
            setDbTotalBalance(result.total);
          } else {
            setDbTotalBalance(0);
          }
        } catch (err) {
          console.error('Failed to load total balance for summary:', err);
          setDbTotalBalance(0);
        }
      };
      loadTotalBalance();
    }
  }, [propTotalBalance, userId, transactions]);

  const monthString = (currentMonthIndex + 1).toString().padStart(2, '0');
  const currentYear = new Date().getFullYear();
  const monthPrefix = `${currentYear}-${monthString}`;
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(monthPrefix));

  const totalExpense = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = propTotalBalance !== undefined 
    ? propTotalBalance 
    : (dbTotalBalance !== null ? dbTotalBalance : 0);

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <View style={styles.topSummaryContainer}>
      {/* Total Money Card (All Accounts) */}
      <View style={[styles.totalCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>ALL ACCOUNTS</Text>
        <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(totalBalance)}</Text>
      </View>

      {/* Expense vs Income Row */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>EXPENSE SO FAR</Text>
          <Text style={[styles.summaryValue, styles.expenseAmount]}>
            -{formatCurrency(totalExpense)}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>INCOME SO FAR</Text>
          <Text style={[styles.summaryValue, styles.incomeAmount]}>
            +{formatCurrency(totalIncome)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topSummaryContainer: {
    marginTop: 16,
    gap: 12,
    marginBottom: 16,
  },
  totalCard: {
    borderRadius: 20,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    height: 75,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  expenseAmount: {
    color: '#D32F2F',
  },
  incomeAmount: {
    color: '#0D8A63',
  },
});
