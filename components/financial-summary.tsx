import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
} from 'react-native';
import { useTransactions } from '@/hooks/useTransactions';
import { useTheme } from '@/context/theme-context';

export function FinancialSummary() {
  const { currentMonthIndex, transactions } = useTransactions();
  const { colors } = useTheme();

  // Filter transactions for currently selected month of 2026
  const monthString = (currentMonthIndex + 1).toString().padStart(2, '0');
  const monthPrefix = `2026-${monthString}`;
  const filteredTransactions = transactions.filter(t => t.date.startsWith(monthPrefix));

  // Compute summary values
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const formatCurrency = (val: number) => {
    return `$${val.toFixed(2)}`;
  };

  return (
    <View style={styles.summaryContainer}>
      {/* Expense Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>EXPENSE</Text>
        <Text style={[styles.summaryAmount, styles.expenseAmount]}>
          -{formatCurrency(totalExpense)}
        </Text>
      </View>

      {/* Income Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>INCOME</Text>
        <Text style={[styles.summaryAmount, styles.incomeAmount]}>
          +{formatCurrency(totalIncome)}
        </Text>
      </View>

      {/* Total Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>TOTAL</Text>
        <Text style={[
          styles.summaryAmount,
          balance >= 0 ? styles.incomeAmount : styles.expenseAmount
        ]}>
          {balance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(balance))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  summaryAmount: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  expenseAmount: {
    color: '#D32F2F', // Soft Red
  },
  incomeAmount: {
    color: '#0D8A63', // Secondary Green / Emerald Green
  },
});
