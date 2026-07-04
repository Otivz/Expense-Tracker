import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '@/hooks/useTransactions';
import { Header } from '@/components/header';
import { FinancialSummary } from '@/components/financial-summary';
import { useTheme } from '@/context/theme-context';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import { DisplayOptionsModal } from '@/components/display-options-modal';

const { height } = Dimensions.get('window');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function RecordsScreen() {
  const { currentMonthIndex, setCurrentMonthIndex, transactions, addTransaction, deleteTransaction } = useTransactions();
  const { colors, isDarkMode } = useTheme();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [displayModalVisible, setDisplayModalVisible] = useState(false);

  // Preference states
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly'>('monthly');
  const [showTotal, setShowTotal] = useState<'yes' | 'no'>('yes');
  const [carryOver, setCarryOver] = useState<'on' | 'off'>('on');
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setMonth(currentMonthIndex);
    return d;
  });

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
    setCurrentMonthIndex(newDate.getMonth());
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
    setCurrentMonthIndex(newDate.getMonth());
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
          filteredTransactions.map((tx) => {
            const catColor = tx.categoryColor || getCategoryColor(tx.category);
            const catIcon = tx.categoryIcon || getCategoryIcon(tx.category);
            return (
              <TouchableOpacity
                key={tx.id}
                style={[styles.txRow, { backgroundColor: colors.card }]}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedTransaction(tx);
                  setIsDetailModalVisible(true);
                }}
              >
                <View style={[styles.txIconContainer, { backgroundColor: `${catColor}15` }]}>
                  <Ionicons name={catIcon as any} size={20} color={catColor} />
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
                    {tx.type === 'income' ? '+' : '-'}₱{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.textSecondary }]}>{tx.date}</Text>
                </View>
              </TouchableOpacity>
            );
          })
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

      {/* Transaction Details Modal */}
      <Modal
        visible={isDetailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDetailModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsDetailModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.detailModalContent, { backgroundColor: colors.card }]}>
                {selectedTransaction && (() => {
                  const headerBg = selectedTransaction.type === 'income' ? '#0D8A63' : '#FF6B6B';
                  const catColor = selectedTransaction.categoryColor || '#6B7B77';
                  
                  return (
                    <>
                      {/* Colored Header Area */}
                      <View style={[styles.detailHeaderSection, { backgroundColor: headerBg }]}>
                        {/* Action buttons */}
                        <View style={styles.detailHeaderTopRow}>
                          <TouchableOpacity onPress={() => setIsDetailModalVisible(false)} style={styles.detailHeaderBtn}>
                            <Ionicons name="close" size={24} color="#FFFFFF" />
                          </TouchableOpacity>
                          <View style={{ flexDirection: 'row', gap: 16 }}>
                            <TouchableOpacity
                              onPress={() => {
                                Alert.alert(
                                  'Delete Record',
                                  'Are you sure you want to delete this record?',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Delete',
                                      style: 'destructive',
                                      onPress: async () => {
                                        await deleteTransaction(selectedTransaction);
                                        setIsDetailModalVisible(false);
                                        setSelectedTransaction(null);
                                      }
                                    }
                                  ]
                                );
                              }}
                              style={styles.detailHeaderBtn}
                            >
                              <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                setIsDetailModalVisible(false);
                                setIsEditModalVisible(true);
                              }}
                              style={styles.detailHeaderBtn}
                            >
                              <Ionicons name="create-outline" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Summary Label & Amount */}
                        <Text style={styles.detailHeaderLabel}>{selectedTransaction.type.toUpperCase()}</Text>
                        <Text style={styles.detailHeaderAmount}>
                          ₱{selectedTransaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        
                        {/* Selected Date */}
                        <Text style={styles.detailHeaderDate}>
                          {(() => {
                            const d = new Date(selectedTransaction.date);
                            if (isNaN(d.getTime())) return selectedTransaction.date;
                            return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' 9:40 AM';
                          })()}
                        </Text>
                      </View>

                      {/* Content Area */}
                      <View style={styles.detailContentSection}>
                        {/* Account Row */}
                        <View style={styles.detailInfoRow}>
                          <Text style={[styles.detailInfoLabel, { color: colors.textSecondary }]}>Account</Text>
                          <View style={[styles.detailCapsule, { borderColor: isDarkMode ? '#FFFFFF22' : '#00000015' }]}>
                            <Ionicons name="wallet-outline" size={16} color={colors.text} />
                            <Text style={[styles.detailCapsuleText, { color: colors.text }]}>
                              {selectedTransaction.accountName || 'Cash'}
                            </Text>
                          </View>
                        </View>

                        {/* Category Row */}
                        <View style={styles.detailInfoRow}>
                          <Text style={[styles.detailInfoLabel, { color: colors.textSecondary }]}>Category</Text>
                          <View style={[styles.detailCapsule, { borderColor: isDarkMode ? '#FFFFFF22' : '#00000015' }]}>
                            <View style={[styles.detailCategoryDot, { backgroundColor: catColor }]} />
                            <Text style={[styles.detailCapsuleText, { color: colors.text }]}>
                              {selectedTransaction.category}
                            </Text>
                          </View>
                        </View>

                        {/* Notes Area */}
                        {selectedTransaction.description ? (
                          <View style={styles.detailNotesContainer}>
                            <Text style={[styles.detailNotesText, { color: colors.text }]}>
                              {selectedTransaction.description}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </>
                  );
                })()}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Transaction Modal */}
      <AddTransactionModal
        visible={isEditModalVisible}
        onClose={() => {
          setIsEditModalVisible(false);
          setSelectedTransaction(null);
        }}
        transactionToEdit={selectedTransaction}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    minHeight: height * 0.5,
  },
  detailHeaderSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  detailHeaderTopRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailHeaderAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  detailHeaderDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  detailContentSection: {
    padding: 24,
    gap: 16,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailInfoLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 8,
  },
  detailCapsuleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailCategoryDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  detailNotesContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(107, 123, 119, 0.08)',
    borderRadius: 12,
    alignItems: 'center',
  },
  detailNotesText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
});
