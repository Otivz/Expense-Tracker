import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '@/hooks/useTransactions';
import { Header } from '@/components/header';
import { FinancialSummary } from '@/components/financial-summary';
import { useTheme } from '@/context/theme-context';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import { DisplayOptionsModal } from '@/components/display-options-modal';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function RecordsScreen() {
  const { transactions } = useTransactions();
  const { colors } = useTheme();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [displayModalVisible, setDisplayModalVisible] = useState(false);

  // Preference states
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly'>('monthly');
  const [showTotal, setShowTotal] = useState<'yes' | 'no'>('yes');
  const [carryOver, setCarryOver] = useState<'on' | 'off'>('on');
  const [currentDate, setCurrentDate] = useState(new Date('2026-06-30'));

  const getSelectorText = () => {
    const year = currentDate.getFullYear();
    if (viewMode === 'daily') {
      const monthLabel = MONTHS[currentDate.getMonth()];
      const day = currentDate.getDate();
      return `${monthLabel} ${day}, ${year}`;
    }
    
    if (viewMode === 'weekly') {
      const sun = new Date(currentDate);
      sun.setDate(currentDate.getDate() - currentDate.getDay());
      const sat = new Date(sun);
      sat.setDate(sun.getDate() + 6);
      
      const sunMonth = MONTHS[sun.getMonth()].substring(0, 3);
      const sunDay = sun.getDate();
      const satMonth = MONTHS[sat.getMonth()].substring(0, 3);
      const satDay = sat.getDate();
      
      return `${sunMonth} ${sunDay} - ${satMonth} ${satDay}`;
    }
    
    if (viewMode === 'monthly') {
      return `${MONTHS[currentDate.getMonth()]} ${year}`;
    }
    
    if (viewMode === '3months') {
      const startMonth = currentDate.getMonth();
      const endMonth = (startMonth + 2) % 12;
      const startLabel = MONTHS[startMonth].substring(0, 3);
      const endLabel = MONTHS[endMonth].substring(0, 3);
      return `${startLabel} - ${endLabel} ${year}`;
    }
    
    if (viewMode === '6months') {
      const isFirstHalf = currentDate.getMonth() < 6;
      return isFirstHalf ? `Jan - Jun ${year}` : `Jul - Dec ${year}`;
    }
    
    return `${year}`; // yearly
  };

  const handlePrevDate = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'monthly') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === '3months') {
      newDate.setMonth(newDate.getMonth() - 3);
    } else if (viewMode === '6months') {
      newDate.setMonth(newDate.getMonth() - 6);
    } else if (viewMode === 'yearly') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'monthly') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === '3months') {
      newDate.setMonth(newDate.getMonth() + 3);
    } else if (viewMode === '6months') {
      newDate.setMonth(newDate.getMonth() + 6);
    } else if (viewMode === 'yearly') {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setCurrentDate(newDate);
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      if (isNaN(txDate.getTime())) return false;
      
      const year = currentDate.getFullYear();
      const txYear = txDate.getFullYear();
      
      if (viewMode === 'daily') {
        return txDate.toDateString() === currentDate.toDateString();
      }
      
      if (viewMode === 'weekly') {
        const sun = new Date(currentDate);
        sun.setDate(currentDate.getDate() - currentDate.getDay());
        sun.setHours(0, 0, 0, 0);
        
        const sat = new Date(sun);
        sat.setDate(sun.getDate() + 6);
        sat.setHours(23, 59, 59, 999);
        
        return txDate >= sun && txDate <= sat;
      }
      
      if (viewMode === 'monthly') {
        return txYear === year && txDate.getMonth() === currentDate.getMonth();
      }
      
      if (viewMode === '3months') {
        const start = new Date(currentDate);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(start);
        end.setMonth(start.getMonth() + 3);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        
        return txDate >= start && txDate <= end;
      }
      
      if (viewMode === '6months') {
        const isFirstHalf = currentDate.getMonth() < 6;
        const startMonth = isFirstHalf ? 0 : 6;
        const endMonth = isFirstHalf ? 5 : 11;
        return txYear === year && txDate.getMonth() >= startMonth && txDate.getMonth() <= endMonth;
      }
      
      return txYear === year; // yearly
    });
  };

  const filteredTransactions = getFilteredTransactions();

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food': return 'fast-food';
      case 'rent': return 'home';
      case 'transport': return 'bus';
      case 'leisure': return 'game-controller';
      case 'salary': return 'briefcase';
      case 'freelance': return 'laptop-outline';
      case 'investments': return 'trending-up';
      default: return 'receipt-outline';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food': return '#FF6B6B';
      case 'rent': return '#4D96FF';
      case 'transport': return '#6BCB77';
      case 'leisure': return '#FFA216';
      case 'salary': return '#0D8A63';
      case 'freelance': return '#9B51E0';
      case 'investments': return '#2D9CDB';
      default: return '#6B7B77';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#014134" />

      {/* Reusable Header Component */}
      <Header title="C-Vault" />

      {/* Main Content Area wrapped in ScrollView */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Month Selector */}
        <View style={[styles.monthSelectorCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={handlePrevDate} style={styles.chevronButton}>
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: colors.text }]}>{getSelectorText()}</Text>
          <TouchableOpacity onPress={handleNextDate} style={styles.chevronButton}>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setDisplayModalVisible(true)}
          >
            <Ionicons name="options-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Financial Summary Cards Component */}
        <FinancialSummary />

        {/* Transactions List or Empty State */}
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={[styles.illustrationCircle, { backgroundColor: colors.card }]}>
              <Ionicons name="receipt-outline" size={48} color={colors.border} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No records found.</Text>
            <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
              Tap <Text style={styles.plusHighlight}>+</Text> to add your first expense or income.
            </Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => (
            <View key={tx.id} style={[styles.txRow, { backgroundColor: colors.card }]}>
              <View style={[styles.txIconContainer, { backgroundColor: `${getCategoryColor(tx.category)}15` }]}>
                <Ionicons name={getCategoryIcon(tx.category) as any} size={20} color={getCategoryColor(tx.category)} />
              </View>
              <View style={styles.txDetails}>
                <Text style={[styles.txCategory, { color: colors.text }]}>{tx.category}</Text>
                <Text style={[styles.txDesc, { color: colors.textSecondary }]}>{tx.description || tx.category}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[
                  styles.txAmount,
                  tx.type === 'income' ? styles.incomeAmount : styles.expenseAmount
                ]}>
                  {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                </Text>
                <Text style={[styles.txDate, { color: colors.textSecondary }]}>{tx.date}</Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setAddModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
      />

      {/* Display Options Modal */}
      <DisplayOptionsModal
        visible={displayModalVisible}
        onClose={() => setDisplayModalVisible(false)}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showTotal={showTotal}
        setShowTotal={setShowTotal}
        carryOver={carryOver}
        setCarryOver={setCarryOver}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAF8', // Background color from design token
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  monthSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chevronButton: {
    padding: 6,
    marginHorizontal: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00684F', // Primary green
    minWidth: 100,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  filterButton: {
    position: 'absolute',
    right: 18,
    padding: 4,
  },

  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80, // Offset for visual balance
  },
  illustrationCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#EAF4F1', // Light Card color
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C2A27', // Text Primary
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7B77', // Text Secondary
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 240,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  plusHighlight: {
    color: '#FFA216',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00684F', // Branding primary green
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C2A27',
  },
  txDesc: {
    fontSize: 12,
    color: '#6B7B77',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  txDate: {
    fontSize: 10,
    color: '#6B7B77',
    marginTop: 4,
  },
  incomeAmount: {
    color: '#0D8A63', // Secondary Green / Emerald Green
  },
  expenseAmount: {
    color: '#D32F2F', // Soft Red
  },
});
