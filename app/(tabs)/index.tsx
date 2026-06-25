import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function RecordsScreen() {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0); // January

  const handlePrevMonth = () => {
    setCurrentMonthIndex((prev) => (prev === 0 ? 11 : prev - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthIndex((prev) => (prev === 11 ? 0 : prev + 1));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#014134" />
      
      {/* Dark Emerald Gradient Header */}
      <LinearGradient
        colors={['#014134', '#00684F']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="menu" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Expense Tracker</Text>
            </View>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="search" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Main Content Area */}
      <View style={styles.content}>
        {/* Month Selector */}
        <View style={styles.monthSelectorCard}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.chevronButton}>
            <Ionicons name="chevron-back" size={18} color="#6B7B77" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{MONTHS[currentMonthIndex]}</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.chevronButton}>
            <Ionicons name="chevron-forward" size={18} color="#6B7B77" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={20} color="#1C2A27" />
          </TouchableOpacity>
        </View>

        {/* Financial Summary Cards */}
        <View style={styles.summaryContainer}>
          {/* Expense Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>EXPENSE</Text>
            <Text style={[styles.summaryAmount, styles.expenseAmount]}>-$0.00</Text>
          </View>

          {/* Income Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>INCOME</Text>
            <Text style={[styles.summaryAmount, styles.incomeAmount]}>+$0.00</Text>
          </View>

          {/* Total Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL</Text>
            <Text style={[styles.summaryAmount, styles.totalAmount]}>$0.00</Text>
          </View>
        </View>

        {/* Empty State / Transactions List Area */}
        <View style={styles.emptyStateContainer}>
          <View style={styles.illustrationCircle}>
            <Ionicons name="receipt-outline" size={48} color="#D7E5E0" />
          </View>
          <Text style={styles.emptyStateTitle}>No records found.</Text>
          <Text style={styles.emptyStateSubtitle}>
            Tap <Text style={styles.plusHighlight}>+</Text> to add your first expense or income.
          </Text>
        </View>
      </View>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAF8', // Background color from design token
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 28,
    paddingBottom: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  content: {
    flex: 1,
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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#6B7B77', // Text Secondary
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
  totalAmount: {
    color: '#FFA216', // Gold / Orange
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
    backgroundColor: '#FFA216', // Orange FAB matching design
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFA216',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
