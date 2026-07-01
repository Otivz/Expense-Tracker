import { Header } from '@/components/header';
import { useTheme } from '@/context/theme-context';
import { useTransactions } from '@/hooks/useTransactions';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import { DisplayOptionsModal } from '@/components/display-options-modal';
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface Budget {
  category: string;
  limit: number;
}

export default function BudgetsScreen() {
  const { currentMonthIndex, setCurrentMonthIndex, transactions, addTransaction } = useTransactions();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  // Pre-load default budgets, including Bills like the reference design
  const [budgets, setBudgets] = useState<Budget[]>([
    { category: 'Bills', limit: 1500.00 }
  ]);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [displayModalVisible, setDisplayModalVisible] = useState(false);

  // Preference states
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly'>('monthly');
  const [showTotal, setShowTotal] = useState<'yes' | 'no'>('yes');
  const [carryOver, setCarryOver] = useState<'on' | 'off'>('on');
  const [currentDate, setCurrentDate] = useState(new Date('2026-06-30'));

  // All potential categories
  const ALL_CATEGORIES = [
    { name: 'Bills', icon: 'document-text', color: '#4D96FF' },
    { name: 'Baby', icon: 'heart-outline', color: '#FF8B94' },
    { name: 'Beauty', icon: 'rose-outline', color: '#FF6B6B' },
    { name: 'Car', icon: 'car-outline', color: '#9B51E0' },
    { name: 'Clothing', icon: 'shirt-outline', color: '#FFA216' },
    { name: 'Food', icon: 'fast-food-outline', color: '#FF6B6B' },
    { name: 'Rent', icon: 'home-outline', color: '#4D96FF' },
    { name: 'Transport', icon: 'bus-outline', color: '#6BCB77' },
    { name: 'Leisure', icon: 'game-controller-outline', color: '#FFA216' },
  ];

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

  // Get spent amount from actual transactions for the currently selected date range
  const getSpentAmount = (category: string) => {
    return transactions
      .filter(t => {
        if (t.category.toLowerCase() !== category.toLowerCase() || t.type !== 'expense') {
          return false;
        }
        
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
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Split categories into budgeted and not budgeted
  const budgetedCategories = budgets;
  const unbudgetedCategories = ALL_CATEGORIES.filter(
    cat => !budgetedCategories.some(b => b.category.toLowerCase() === cat.name.toLowerCase())
  );

  // Totals calculations
  const totalBudget = budgetedCategories.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgetedCategories.reduce((sum, b) => sum + getSpentAmount(b.category), 0);

  const openSetBudgetModal = (category: string) => {
    const existingBudget = budgets.find(b => b.category.toLowerCase() === category.toLowerCase());
    setSelectedCategory(category);
    setLimitInput(existingBudget ? existingBudget.limit.toString() : '');
    setModalVisible(true);
  };

  const handleSaveBudget = () => {
    const parsedLimit = parseFloat(limitInput);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      Alert.alert('Invalid Limit', 'Please enter a valid positive number.');
      return;
    }

    setBudgets(prev => {
      const filtered = prev.filter(b => b.category.toLowerCase() !== selectedCategory.toLowerCase());
      return [...filtered, { category: selectedCategory, limit: parsedLimit }];
    });
    setModalVisible(false);
    setLimitInput('');
  };

  const handleDeleteBudget = (category: string) => {
    Alert.alert(
      'Remove Budget',
      `Are you sure you want to remove the budget for ${category}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setBudgets(prev => prev.filter(b => b.category.toLowerCase() !== category.toLowerCase()));
          }
        }
      ]
    );
  };

  const getCategoryDetails = (name: string) => {
    return ALL_CATEGORIES.find(c => c.name.toLowerCase() === name.toLowerCase()) || {
      name,
      icon: 'receipt-outline',
      color: '#6B7B77'
    };
  };

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#014134" />

      {/* Reusable Header Component */}
      <Header title="C-Vault" />

      {/* Main Content Area wrapped in ScrollView */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Month Selector Card (styled exactly like the home screen card) */}
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

        {/* Totals Summary Card */}
        <View style={[styles.totalsSummaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.totalsSummaryCol}>
            <Text style={[styles.totalsSummaryLabel, { color: colors.textSecondary }]}>TOTAL BUDGET</Text>
            <Text style={[styles.totalsSummaryValue, { color: colors.text }]}>{formatCurrency(totalBudget)}</Text>
          </View>
          <View style={[styles.totalsSummaryDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.totalsSummaryCol}>
            <Text style={[styles.totalsSummaryLabel, { color: colors.textSecondary }]}>TOTAL SPENT</Text>
            <Text style={[
              styles.totalsSummaryValue,
              { color: totalSpent > totalBudget ? '#D32F2F' : colors.primary }
            ]}>
              {formatCurrency(totalSpent)}
            </Text>
          </View>
        </View>

        {/* Section 1: Budgeted Categories */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>Budgeted categories: {MONTHS[currentMonthIndex].substring(0, 3)} 2026</Text>
        </View>

        {budgetedCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No budgets configured for this month.</Text>
          </View>
        ) : (
          budgetedCategories.map((budget) => {
            const catInfo = getCategoryDetails(budget.category);
            const spent = getSpentAmount(budget.category);
            const remaining = budget.limit - spent;
            const percentage = Math.min(spent / budget.limit, 1);

            return (
              <View key={budget.category} style={[styles.budgetCard, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.categoryIconCircle, { backgroundColor: `${catInfo.color}15` }]}>
                      <Ionicons name={catInfo.icon as any} size={22} color={catInfo.color} />
                    </View>
                    <View style={styles.categoryMeta}>
                      <Text style={[styles.categoryName, { color: colors.text }]}>{catInfo.name}</Text>
                      <Text style={[styles.budgetLimitLabel, { color: colors.textSecondary }]}>Limit: {formatCurrency(budget.limit)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteBudget(budget.category)}
                    style={styles.moreButton}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color="#8E9E9A" />
                  </TouchableOpacity>
                </View>

                {/* Spent & Remaining text details */}
                <View style={styles.budgetProgressDetails}>
                  <View>
                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                      Spent: <Text style={styles.spentHighlight}>{formatCurrency(spent)}</Text>
                    </Text>
                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                      Remaining: <Text style={remaining >= 0 ? styles.remainingSafe : styles.remainingOver}>{formatCurrency(remaining)}</Text>
                    </Text>
                  </View>

                  {/* Badge displaying remaining or limit */}
                  <TouchableOpacity onPress={() => openSetBudgetModal(budget.category)}>
                    <View style={[
                      styles.remainingBadge,
                      { backgroundColor: remaining >= 0 ? '#E8F5E9' : '#FFEBEE' }
                    ]}>
                      <Text style={[
                        styles.remainingBadgeText,
                        { color: remaining >= 0 ? '#2E7D32' : '#C62828' }
                      ]}>
                        {formatCurrency(Math.max(0, remaining))}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressBarBg, { backgroundColor: colors.divider }]}>
                  <View style={[
                    styles.progressBarFill,
                    {
                      width: `${percentage * 100}%`,
                      backgroundColor: percentage >= 0.9 ? '#D32F2F' : percentage >= 0.7 ? '#F57C00' : '#0D8A63'
                    }
                  ]} />
                </View>
              </View>
            );
          })
        )}

        {/* Section 2: Not Budgeted Categories */}
        <View style={[styles.sectionHeaderContainer, { marginTop: 24 }]}>
          <Text style={styles.sectionHeader}>Not budgeted this month</Text>
        </View>

        <View style={styles.unbudgetedList}>
          {unbudgetedCategories.map((cat) => (
            <View key={cat.name} style={styles.unbudgetedRow}>
              <View style={styles.unbudgetedLeft}>
                <View style={[styles.categoryIconCircle, { backgroundColor: `${cat.color}15` }]}>
                  <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                </View>
                <Text style={styles.unbudgetedName}>{cat.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.setBudgetButton}
                onPress={() => openSetBudgetModal(cat.name)}
              >
                <Text style={styles.setBudgetButtonText}>SET BUDGET</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
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

      {/* Modal for setting/updating budget limit */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Budget Limit</Text>
            <Text style={styles.modalSub}>Configure budget limit for "{selectedCategory}"</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter limit amount (e.g. 1500)"
              placeholderTextColor="#8E9E9A"
              keyboardType="numeric"
              value={limitInput}
              onChangeText={setLimitInput}
              autoFocus={true}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSaveBudget}
              >
                <Text style={styles.modalBtnSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  monthSelectorCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    position: 'relative',
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
    color: colors.primary,
    minWidth: 100,
    textAlign: 'center',
  },
  filterButton: {
    position: 'absolute',
    right: 18,
    padding: 4,
  },
  content: {
    paddingHorizontal: 16,
  },
  sectionHeaderContainer: {
    marginTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  budgetCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryMeta: {
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  budgetLimitLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  budgetProgressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  spentHighlight: {
    color: '#0D8A63',
    fontWeight: '700',
  },
  remainingSafe: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  remainingOver: {
    color: '#C62828',
    fontWeight: '700',
  },
  remainingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  remainingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.divider,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  unbudgetedList: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
    overflow: 'hidden',
  },
  unbudgetedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  unbudgetedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unbudgetedName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  setBudgetButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setBudgetButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  modalSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: colors.divider,
  },
  modalBtnCancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalBtnSave: {
    backgroundColor: colors.primary,
  },
  modalBtnSaveText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  totalsSummaryCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  totalsSummaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  totalsSummaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  totalsSummaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  totalsSummaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
});
