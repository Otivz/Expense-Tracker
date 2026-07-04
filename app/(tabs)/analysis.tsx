import { Header } from '@/components/header';
import { useTheme } from '@/context/theme-context';
import { useTransactions } from '@/hooks/useTransactions';
import { categoryRepository } from '@/db/repositories/categoryRepository';
import { accountRepository } from '@/db/repositories/accountRepository';
import { useVault } from '@/context/vault-context';
import { useFocusEffect } from 'expo-router';
import { type Category } from '@/db/models/category';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import { DisplayOptionsModal } from '@/components/display-options-modal';
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Rect, Stop, LinearGradient as SvgLinearGradient, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DropdownOption =
  | 'Expense Overview'
  | 'Income Overview'
  | 'Expense Flow'
  | 'Income Flow'
  | 'Account Analysis';

const DROPDOWN_OPTIONS: DropdownOption[] = [
  'Expense Overview',
  'Income Overview',
  'Expense Flow',
  'Income Flow',
  'Account Analysis'
];

const ACCOUNT_ICONS: Record<string, { icon: string; color: string; bgColor: string }> = {
  cash: { icon: 'cash', color: '#0D8A63', bgColor: '#EAF4F1' },
  card: { icon: 'credit-card', color: '#4D96FF', bgColor: '#EEF5FF' },
  piggybank: { icon: 'piggy-bank', color: '#FF6B6B', bgColor: '#FFEAEA' },
  visa: { icon: 'credit-card-outline', color: '#1A1F71', bgColor: '#E2ECFC' },
};

export default function AnalysisScreen() {
  const { currentMonthIndex, setCurrentMonthIndex, transactions } = useTransactions();
  const { colors: themeColors, isDarkMode } = useTheme();
  const { currentAccount } = useVault();
  const userId = currentAccount?.id || 'mock-user-id';
  const styles = getStyles(themeColors);

  const [selectedOption, setSelectedOption] = useState<DropdownOption>('Expense Overview');
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  // Database States
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);

  // Interactive calendar and details modal state
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'expense' | 'income'>('expense');

  // Account details modal state
  const [isAccountModalVisible, setIsAccountModalVisible] = useState(false);
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<any | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [displayModalVisible, setDisplayModalVisible] = useState(false);
  const [accountSortOrder, setAccountSortOrder] = useState<'new_to_old' | 'old_to_new'>('new_to_old');

  // Preference states
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly'>('monthly');
  const [showTotal, setShowTotal] = useState<'yes' | 'no'>('yes');
  const [carryOver, setCarryOver] = useState<'on' | 'off'>('on');
  
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setMonth(currentMonthIndex);
    return d;
  });

  const loadAnalysisData = useCallback(async () => {
    try {
      const [cats, accs] = await Promise.all([
        categoryRepository.getAll(userId),
        accountRepository.getAll(userId)
      ]);
      setDbCategories(cats);
      setDbAccounts(accs);
    } catch (err) {
      console.error('Failed to load categories for analysis:', err);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadAnalysisData();
    }, [loadAnalysisData])
  );

  useEffect(() => {
    setCurrentDate(prev => {
      if (prev.getMonth() !== currentMonthIndex) {
        const d = new Date(prev);
        d.setMonth(currentMonthIndex);
        return d;
      }
      return prev;
    });
  }, [currentMonthIndex]);

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

  // Filter transactions for currently selected date range
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

  const monthTransactions = getFilteredTransactions();

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCatColor = (name: string, index: number) => {
    const cat = dbCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
    return cat?.color || ['#FF6B6B', '#4D96FF', '#6BCB77', '#FFA216', '#9B51E0', '#2D9CDB'][index % 6];
  };

  const getCatIcon = (name: string) => {
    const cat = dbCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
    return cat?.icon || 'receipt-outline';
  };

  const totalExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Calendar calculations
  const year = currentDate.getFullYear();
  const firstDayIndex = new Date(year, currentDate.getMonth(), 1).getDay();
  const totalDays = new Date(year, currentDate.getMonth() + 1, 0).getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push(i);
  }

  // Group transactions of selected month by day
  const getDayTransactions = (day: number) => {
    const dayStr = day.toString().padStart(2, '0');
    const monthString = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const dateStr = `2026-${monthString}-${dayStr}`;
    return monthTransactions.filter(t => t.date === dateStr);
  };

  const handleDayPress = (day: number) => {
    const dayTxs = getDayTransactions(day);
    if (dayTxs.length > 0) {
      setSelectedDay(day);
      // Auto-select tab with data
      const hasExpense = dayTxs.some(t => t.type === 'expense');
      setDetailsTab(hasExpense ? 'expense' : 'income');
      setIsDetailsModalVisible(true);
    }
  };

  // SVG Line Chart coordinates calculation helper
  const renderFlowLineChart = (flowType: 'expense' | 'income') => {
    const filtered = monthTransactions.filter(t => t.type === flowType);

    // Group amounts by weekly periods: Days 1-7, 8-14, 15-21, 22-28, 29-31
    const weeks = [0, 0, 0, 0, 0];
    filtered.forEach(t => {
      const day = parseInt(t.date.split('-')[2], 10);
      if (day <= 7) weeks[0] += t.amount;
      else if (day <= 14) weeks[1] += t.amount;
      else if (day <= 21) weeks[2] += t.amount;
      else if (day <= 28) weeks[3] += t.amount;
      else weeks[4] += t.amount;
    });

    const maxAmt = Math.max(...weeks, 100);
    const height = 145;
    const chartWidth = width - 72;
    const paddingLeft = 75;
    const paddingRight = 20;
    const paddingTop = 15;
    const paddingBottom = 30;

    // Map weeks to coordinates
    const points = weeks.map((amt, idx) => {
      const x = paddingLeft + (idx * (chartWidth - paddingLeft - paddingRight)) / 4;
      const y = height - paddingBottom - (amt / maxAmt) * (height - paddingTop - paddingBottom);
      return { x, y };
    });

    // Create SVG Path
    let pathData = '';
    if (points.length > 0) {
      pathData = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathData += ` L ${points[i].x} ${points[i].y}`;
      }
    }

    // Create Gradient Fill Path
    const fillPathData = pathData
      ? `${pathData} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
      : '';

    const strokeColor = flowType === 'expense' ? '#FF6B6B' : '#0D8A63';
    const gradientId = `flowGrad-${flowType}`;

    const yLines = [
      { y: height - paddingBottom, val: 0 },
      { y: height - paddingBottom - (height - paddingTop - paddingBottom) / 3, val: maxAmt / 3 },
      { y: height - paddingBottom - 2 * (height - paddingTop - paddingBottom) / 3, val: maxAmt * 2 / 3 },
      { y: paddingTop, val: maxAmt }
    ];

    const formatYLabel = (val: number) => {
      const sign = flowType === 'expense' ? '-' : '+';
      return `${sign}${formatCurrency(val)}`;
    };

    return (
      <View style={styles.chartContainer}>
        <Svg height={height} width={chartWidth}>
          <Defs>
            <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </SvgLinearGradient>
          </Defs>
          {/* Grid lines & Y Axis Labels */}
          {yLines.map((line, idx) => (
            <React.Fragment key={`grid-${idx}`}>
              <Line
                x1={paddingLeft}
                y1={line.y}
                x2={chartWidth - paddingRight}
                y2={line.y}
                stroke={idx === 0 ? themeColors.border : themeColors.divider}
                strokeWidth={idx === 0 ? "1.5" : "1"}
              />
              <SvgText
                x={paddingLeft - 8}
                y={line.y + 3.5}
                fontSize="10"
                fill={themeColors.textSecondary}
                textAnchor="end"
                fontWeight="600"
              >
                {formatYLabel(line.val)}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Gradient Area Fill */}
          {fillPathData ? (
            <>
              <Path
                d={fillPathData}
                fill={`url(#${gradientId})`}
              />
              <Path
                d={pathData}
                fill="none"
                stroke={strokeColor}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </>
          ) : null}

          {/* Dots on points */}
          {points.map((p, idx) => (
            <Circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#FFFFFF"
              stroke={strokeColor}
              strokeWidth="2.5"
            />
          ))}

          {/* X Axis Labels */}
          {points.map((p, idx) => {
            const days = ['01', '08', '16', '23', '30'];
            const monthAbbr = MONTHS[currentMonthIndex].substring(0, 3);
            const labelText = `${monthAbbr} ${days[idx]}`;
            return (
              <SvgText
                key={`x-label-${idx}`}
                x={p.x}
                y={height - 8}
                fontSize="10"
                fill={themeColors.textSecondary}
                textAnchor="middle"
                fontWeight="600"
              >
                {labelText}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    );
  };

  const renderSelectedContent = () => {
    // Check empty state
    if (monthTransactions.length === 0) {
      return (
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyStateIconCircle}>
            <Ionicons name="pie-chart-outline" size={42} color="#D7E5E0" />
          </View>
          <Text style={styles.emptyStateTitle}>No data to analyze</Text>
          <Text style={styles.emptyStateSubtitle}>
            Add income or expense records for {MONTHS[currentMonthIndex]} 2026 to unlock full visual analytics.
          </Text>
        </View>
      );
    }

    switch (selectedOption) {
      case 'Expense Overview': {
        const categoryMap: { [key: string]: number } = {};
        const expenses = monthTransactions.filter(t => t.type === 'expense');
        expenses.forEach(t => {
          categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        });

        const sortedCategories = Object.keys(categoryMap).map(cat => ({
          name: cat,
          amount: categoryMap[cat],
          percentage: (categoryMap[cat] / totalExpense) * 100,
        })).sort((a, b) => b.amount - a.amount);

        // Render simple dynamic SVG Donut Chart
        let currentStrokeOffset = 0;
        const circumference = 301.6; // 2 * pi * r (r = 48)

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Expense Breakdown</Text>
              <Text style={styles.cardSubtitle}>By Category</Text>
            </View>

            <View style={styles.chartSection}>
              <View style={styles.chartWrapper}>
                <Svg width="130" height="130" viewBox="0 0 120 120">
                  <G transform="rotate(-90 60 60)">
                    <Circle cx="60" cy="60" r="48" stroke={themeColors.primaryLight} strokeWidth="14" fill="none" />
                    {sortedCategories.map((cat, idx) => {
                      const strokeLength = (cat.percentage / 100) * circumference;
                      const strokeOffset = currentStrokeOffset;
                      currentStrokeOffset -= strokeLength;
                      return (
                        <Circle
                          key={cat.name}
                          cx="60"
                          cy="60"
                          r="48"
                          stroke={getCatColor(cat.name, idx)}
                          strokeWidth="14"
                          fill="none"
                          strokeDasharray={`${strokeLength} ${circumference}`}
                          strokeDashoffset={strokeOffset}
                        />
                      );
                    })}
                  </G>
                </Svg>
                <View style={styles.chartCenterLabelContainer}>
                  <Text style={styles.chartCenterLabelText}>Expenses</Text>
                </View>
              </View>

              <View style={styles.legendContainer}>
                {sortedCategories.slice(0, 4).map((cat, idx) => (
                  <View key={cat.name} style={styles.legendItem}>
                    <View style={[styles.legendSquare, { backgroundColor: getCatColor(cat.name, idx) }]} />
                    <Text style={styles.legendText}>{cat.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {sortedCategories.map((cat, idx) => {
              const iconName = getCatIcon(cat.name);
              const catColor = getCatColor(cat.name, idx);
              const lightColor = `${catColor}15`;

              return (
                <View key={cat.name} style={styles.categoryItemRow}>
                  <View style={[styles.iconCircle, { backgroundColor: lightColor }]}>
                    <Ionicons name={iconName as any} size={18} color={catColor} />
                  </View>
                  <View style={styles.categoryContent}>
                    <View style={styles.categoryTextRow}>
                      <Text style={styles.categoryNameText}>{cat.name}</Text>
                      <Text style={[styles.categoryAmountText, { color: catColor }]}>
                        -{formatCurrency(cat.amount)}
                      </Text>
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${cat.percentage}%`, backgroundColor: catColor }]} />
                      </View>
                      <Text style={styles.percentageText}>{cat.percentage.toFixed(2)}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        );
      }

      case 'Income Overview': {
        const categoryMap: { [key: string]: number } = {};
        const incomes = monthTransactions.filter(t => t.type === 'income');
        incomes.forEach(t => {
          categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        });

        const sortedCategories = Object.keys(categoryMap).map(cat => ({
          name: cat,
          amount: categoryMap[cat],
          percentage: (categoryMap[cat] / totalIncome) * 100,
        })).sort((a, b) => b.amount - a.amount);

        let currentStrokeOffset = 0;
        const circumference = 301.6;

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Income Breakdown</Text>
              <Text style={styles.cardSubtitle}>By Source</Text>
            </View>

            <View style={styles.chartSection}>
              <View style={styles.chartWrapper}>
                <Svg width="130" height="130" viewBox="0 0 120 120">
                  <G transform="rotate(-90 60 60)">
                    <Circle cx="60" cy="60" r="48" stroke={themeColors.primaryLight} strokeWidth="14" fill="none" />
                    {sortedCategories.map((cat, idx) => {
                      const strokeLength = (cat.percentage / 100) * circumference;
                      const strokeOffset = currentStrokeOffset;
                      currentStrokeOffset -= strokeLength;
                      return (
                        <Circle
                          key={cat.name}
                          cx="60"
                          cy="60"
                          r="48"
                          stroke={getCatColor(cat.name, idx)}
                          strokeWidth="14"
                          fill="none"
                          strokeDasharray={`${strokeLength} ${circumference}`}
                          strokeDashoffset={strokeOffset}
                        />
                      );
                    })}
                  </G>
                </Svg>
                <View style={styles.chartCenterLabelContainer}>
                  <Text style={styles.chartCenterLabelText}>Income</Text>
                </View>
              </View>

              <View style={styles.legendContainer}>
                {sortedCategories.map((cat, idx) => (
                  <View key={cat.name} style={styles.legendItem}>
                    <View style={[styles.legendSquare, { backgroundColor: getCatColor(cat.name, idx) }]} />
                    <Text style={styles.legendText}>{cat.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {sortedCategories.map((cat, idx) => {
              const iconName = getCatIcon(cat.name);
              const catColor = getCatColor(cat.name, idx);
              const lightColor = `${catColor}15`;

              return (
                <View key={cat.name} style={styles.categoryItemRow}>
                  <View style={[styles.iconCircle, { backgroundColor: lightColor }]}>
                    <Ionicons name={iconName as any} size={18} color={catColor} />
                  </View>
                  <View style={styles.categoryContent}>
                    <View style={styles.categoryTextRow}>
                      <Text style={styles.categoryNameText}>{cat.name}</Text>
                      <Text style={[styles.categoryAmountText, { color: catColor }]}>
                        +{formatCurrency(cat.amount)}
                      </Text>
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${cat.percentage}%`, backgroundColor: catColor }]} />
                      </View>
                      <Text style={styles.percentageText}>{cat.percentage.toFixed(2)}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        );
      }

      case 'Expense Flow':
      case 'Income Flow': {
        const isExpense = selectedOption === 'Expense Flow';
        const flowColor = isExpense ? '#FF6B6B' : '#0D8A63';

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{isExpense ? 'Expense Flow' : 'Income Flow'}</Text>
              <Text style={styles.cardSubtitle}>
                {isExpense ? 'Outflow Analysis & Calendar' : 'Inflow Analysis & Calendar'}
              </Text>
            </View>

            {/* Render dynamic Line Graph */}
            {renderFlowLineChart(isExpense ? 'expense' : 'income')}

            <View style={styles.divider} />

            {/* Interactive Calendar Grid */}
            <View style={styles.calendarHeaderContainer}>
              <Text style={styles.calendarTitleText}>{MONTHS[currentMonthIndex]} 2026</Text>
            </View>

            {/* Weekdays Row */}
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map(day => (
                <Text key={day} style={styles.weekdayText}>{day}</Text>
              ))}
            </View>

            {/* Grid days */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} style={styles.calendarCellEmpty} />;
                }

                // Check transactions on this day
                const dayTxs = getDayTransactions(day);
                const dayFlows = dayTxs.filter(t => t.type === (isExpense ? 'expense' : 'income'));
                const totalAmt = dayFlows.reduce((sum, t) => sum + t.amount, 0);

                const hasTxs = dayTxs.length > 0;
                const hasFlowTxs = dayFlows.length > 0;

                return (
                  <TouchableOpacity
                    key={`day-${day}`}
                    style={[
                      styles.calendarCell,
                      hasFlowTxs && styles.calendarCellWithTx
                    ]}
                    onPress={() => handleDayPress(day)}
                    disabled={!hasTxs}
                  >
                    <Text style={styles.calendarDayNum}>{day}</Text>
                    {hasFlowTxs ? (
                      <Text style={[styles.calendarCellAmt, { color: flowColor }]}>
                        {isExpense ? '-' : '+'}{totalAmt.toFixed(0)}
                      </Text>
                    ) : hasTxs ? (
                      // Dot if there are transactions but of the other type
                      <View style={[styles.indicatorDot, { backgroundColor: isExpense ? '#0D8A63' : '#FF6B6B' }]} />
                    ) : (
                      // Light placeholder dot for clean grid
                      <View style={styles.placeholderDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      }

      case 'Account Analysis': {
        // Calculate dynamic expenses and income per account
        const accountStats = dbAccounts.map(acc => {
          const accTxs = monthTransactions.filter(t => t.accountName?.toLowerCase() === acc.name.toLowerCase());
          const accExpense = accTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
          const accIncome = accTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
          return {
            ...acc,
            expense: accExpense,
            income: accIncome
          };
        });

        // Determine max amount for scale
        const totalExpenses = accountStats.reduce((sum, a) => sum + a.expense, 0);
        const totalIncomes = accountStats.reduce((sum, a) => sum + a.income, 0);
        const maxAmt = Math.max(totalExpenses, totalIncomes, 100);

        const chartHeight = 160;
        const chartWidth = width - 72;
        const paddingLeft = 75;
        const paddingRight = 20;
        const paddingTop = 35;
        const paddingBottom = 30;
        const contentWidth = chartWidth - paddingLeft - paddingRight;

        const yLines = [
          { y: chartHeight - paddingBottom, val: 0 },
          { y: chartHeight - paddingBottom - (chartHeight - paddingTop - paddingBottom) / 3, val: maxAmt / 3 },
          { y: chartHeight - paddingBottom - 2 * (chartHeight - paddingTop - paddingBottom) / 3, val: maxAmt * 2 / 3 },
          { y: paddingTop, val: maxAmt }
        ];

        // Bar dimensions
        const barWidth = Math.max(6, Math.min(28, (contentWidth / Math.max(accountStats.length, 1)) / 3));
        const gap = Math.max(2, barWidth / 4);

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Account Allocation</Text>
              <Text style={styles.cardSubtitle}>Distribution of funds</Text>
            </View>

            {/* SVG Bar Chart */}
            <View style={styles.chartContainer}>
              <Svg height={chartHeight} width={chartWidth}>
                {/* Grid lines & Y Axis Labels */}
                {yLines.map((line, idx) => (
                  <React.Fragment key={`grid-${idx}`}>
                    <Line
                      x1={paddingLeft}
                      y1={line.y}
                      x2={chartWidth - paddingRight}
                      y2={line.y}
                      stroke={idx === 0 ? themeColors.border : themeColors.divider}
                      strokeWidth={idx === 0 ? "1.5" : "1"}
                    />
                    <SvgText
                      x={paddingLeft - 8}
                      y={line.y + 3.5}
                      fontSize="10"
                      fill={themeColors.textSecondary}
                      textAnchor="end"
                      fontWeight="600"
                    >
                      {formatCurrency(line.val)}
                    </SvgText>
                  </React.Fragment>
                ))}

                {/* Draw side-by-side bars for each account */}
                {accountStats.map((acc, idx) => {
                  const segmentWidth = contentWidth / Math.max(accountStats.length, 1);
                  const xOffset = paddingLeft + (idx * segmentWidth);
                  const centerX = xOffset + segmentWidth / 2;

                  const accExpenseBarHeight = (acc.expense / maxAmt) * (chartHeight - paddingTop - paddingBottom);
                  const accIncomeBarHeight = (acc.income / maxAmt) * (chartHeight - paddingTop - paddingBottom);
                  
                  return (
                    <G key={acc.id}>
                      {/* Expense Bar */}
                      <Rect
                        x={centerX - barWidth - gap / 2}
                        y={chartHeight - paddingBottom - accExpenseBarHeight}
                        width={barWidth}
                        height={accExpenseBarHeight}
                        fill="#FF6B6B"
                        rx={3}
                      />
                      {/* Income Bar */}
                      <Rect
                        x={centerX + gap / 2}
                        y={chartHeight - paddingBottom - accIncomeBarHeight}
                        width={barWidth}
                        height={accIncomeBarHeight}
                        fill="#0D8A63"
                        rx={3}
                      />
                      {/* X Axis Label */}
                      <SvgText
                        x={centerX}
                        y={chartHeight - paddingBottom + 16}
                        fontSize="9"
                        fill={themeColors.textSecondary}
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {acc.name.substring(0, 8)}
                      </SvgText>
                    </G>
                  );
                })}

                {/* Legend */}
                <Rect x={chartWidth - 130} y={8} width={8} height={8} fill="#FF6B6B" rx={1.5} />
                <SvgText x={chartWidth - 118} y={15} fontSize="9" fill={themeColors.textSecondary} fontWeight="600">Expense</SvgText>
                <Rect x={chartWidth - 68} y={8} width="8" height="8" rx="1.5" fill="#0D8A63" />
                <SvgText x={chartWidth - 56} y={15} fontSize="9" fill={themeColors.textSecondary} fontWeight="600">Income</SvgText>
              </Svg>
            </View>

            {/* Account Card Rows */}
            {accountStats.map(acc => {
              const iconInfo = ACCOUNT_ICONS[acc.type as keyof typeof ACCOUNT_ICONS] || {
                icon: 'wallet-outline',
                color: '#6B7B77',
                bgColor: '#F4FAF8'
              };

              return (
                <TouchableOpacity
                  key={acc.id}
                  style={styles.accountRowClickable}
                  onPress={() => {
                    setSelectedAccountForDetails(acc);
                    setIsAccountModalVisible(true);
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: iconInfo.bgColor }]}>
                    <Ionicons name={iconInfo.icon as any} size={20} color={iconInfo.color} />
                  </View>
                  <View style={styles.accountCardContent}>
                    <Text style={[styles.accountCardTitle, { color: themeColors.text }]}>{acc.name}</Text>
                    <View style={styles.accountPeriodInfoRow}>
                      <Text style={[styles.accountPeriodLabel, { color: themeColors.textSecondary }]}>This period: </Text>
                      <View style={styles.accountPeriodExpenseBox}>
                        <Text style={styles.accountPeriodExpenseText}>-{formatCurrency(acc.expense)}</Text>
                      </View>
                      <View style={styles.accountPeriodIncomeBox}>
                        <Text style={styles.accountPeriodIncomeText}>+{formatCurrency(acc.income)}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      }

      default:
        return null;
    }
  };

  const selectedDayTransactions = selectedDay ? getDayTransactions(selectedDay) : [];
  const modalFilteredTransactions = selectedDayTransactions.filter(t => t.type === detailsTab);

  // Account modal dynamic stats
  const activeAccountName = selectedAccountForDetails?.name || '';
  const accountTxs = activeAccountName
    ? monthTransactions.filter(t => t.accountName?.toLowerCase() === activeAccountName.toLowerCase())
    : [];

  const accountPeriodExpense = accountTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const accountPeriodIncome = accountTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const accountEndingBalance = selectedAccountForDetails?.balance || 0;
  const accountStartingBalance = accountEndingBalance - accountPeriodIncome + accountPeriodExpense;

  const accountTransfersIn = accountTxs
    .filter(t => t.type === 'income' && t.category.toLowerCase() === 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  const accountTransfersOut = accountTxs
    .filter(t => t.type === 'expense' && t.category.toLowerCase() === 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  // Group transactions for the modal by date
  const sortedAccountTxs = [...accountTxs].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return accountSortOrder === 'new_to_old' ? timeB - timeA : timeA - timeB;
  });

  const accountGroupDates = Array.from(new Set(sortedAccountTxs.map(t => t.date)));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#014134" />



      {/* Reusable Header Component */}
      <Header title="C-Vault" />

      {/* Main Scrollable Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.monthSelectorCard}>
          <TouchableOpacity onPress={handlePrevDate} style={styles.chevronButton}>
            <Ionicons name="chevron-back" size={18} color={themeColors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{getSelectorText()}</Text>
          <TouchableOpacity onPress={handleNextDate} style={styles.chevronButton}>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setDisplayModalVisible(true)}
          >
            <Ionicons name="options-outline" size={20} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        {/* Financial Summary Cards */}
        <View style={styles.summaryContainer}>
          {/* Expense Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>EXPENSE</Text>
            <Text style={[styles.summaryAmount, styles.expenseAmount]}>
              -{formatCurrency(totalExpense)}
            </Text>
          </View>

          {/* Income Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>INCOME</Text>
            <Text style={[styles.summaryAmount, styles.incomeAmount]}>
              +{formatCurrency(totalIncome)}
            </Text>
          </View>

          {/* Total Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL</Text>
            <Text style={[
              styles.summaryAmount,
              balance >= 0 ? styles.incomeAmount : styles.expenseAmount
            ]}>
              {balance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(balance))}
            </Text>
          </View>
        </View>

        {/* Custom Dropdown Trigger */}
        <TouchableOpacity
          style={styles.dropdownTrigger}
          activeOpacity={0.8}
          onPress={() => setIsDropdownVisible(true)}
        >
          <View style={styles.dropdownTriggerLeft}>
            <Ionicons name="analytics" size={20} color={themeColors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.dropdownTriggerText}>{selectedOption}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={themeColors.textSecondary} />
        </TouchableOpacity>

        {/* Selected Dropdown Option Content */}
        {renderSelectedContent()}

        {/* Extra space bottom */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal Dropdown Picker */}
      <Modal
        visible={isDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDropdownVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select View</Text>
                <TouchableOpacity onPress={() => setIsDropdownVisible(false)}>
                  <Ionicons name="close" size={22} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>
              {DROPDOWN_OPTIONS.map((option) => {
                const isSelected = option === selectedOption;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                    onPress={() => {
                      setSelectedOption(option);
                      setIsDropdownVisible(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                      {option}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color="#00684F" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Date Details Modal */}
      <Modal
        visible={isDetailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDetailsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsDetailsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.detailsModalContent}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {MONTHS[currentMonthIndex]} {selectedDay}, 2026
                  </Text>
                  <TouchableOpacity onPress={() => setIsDetailsModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#6B7B77" />
                  </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.modalTabsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.modalTabButton,
                      detailsTab === 'expense' && styles.modalTabButtonActive
                    ]}
                    onPress={() => setDetailsTab('expense')}
                  >
                    <Text style={[
                      styles.modalTabText,
                      detailsTab === 'expense' && styles.modalTabTextActive
                    ]}>
                      Expenses
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalTabButton,
                      detailsTab === 'income' && styles.modalTabButtonActive
                    ]}
                    onPress={() => setDetailsTab('income')}
                  >
                    <Text style={[
                      styles.modalTabText,
                      detailsTab === 'income' && styles.modalTabTextActive
                    ]}>
                      Income
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* List */}
                <ScrollView style={styles.modalTxsList} showsVerticalScrollIndicator={false}>
                  {modalFilteredTransactions.length === 0 ? (
                    <Text style={styles.noTxsText}>No {detailsTab} records on this day.</Text>
                  ) : (
                    modalFilteredTransactions.map((tx) => (
                      <View key={tx.id} style={styles.modalTxItem}>
                        <View style={styles.modalTxLeft}>
                          <Text style={styles.modalTxCategory}>{tx.category}</Text>
                          {tx.description ? (
                            <Text style={styles.modalTxDesc}>{tx.description}</Text>
                          ) : null}
                        </View>
                        <Text style={[
                          styles.modalTxAmount,
                          tx.type === 'income' ? styles.incomeAmount : styles.expenseAmount
                        ]}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </Text>
                      </View>
                    ))
                  )}
                  <View style={{ height: 20 }} />
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Account Details Modal */}
      <Modal
        visible={isAccountModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAccountModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsAccountModalVisible(false)}>
          <View style={styles.accountModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.accountModalContent, { backgroundColor: themeColors.card }]}>
                {/* Header */}
                <View style={styles.accountModalHeader}>
                  <TouchableOpacity onPress={() => setIsAccountModalVisible(false)} style={styles.accountModalCloseBtn}>
                    <Ionicons name="close" size={24} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                  <View style={styles.accountModalHeaderTitleContainer}>
                    <Text style={[styles.accountModalTitle, { color: themeColors.text }]}>Account details</Text>
                    <Text style={[styles.accountModalSubtitle, { color: themeColors.textSecondary }]}>
                      Time selected: {`${MONTHS[currentMonthIndex].substring(0, 3)} 01 - ${MONTHS[currentMonthIndex].substring(0, 3)} ${totalDays}`}
                    </Text>
                  </View>
                </View>

                {/* Main Scrollable Modal Content */}
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 40 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Account row */}
                  {selectedAccountForDetails && (() => {
                    const iconInfo = ACCOUNT_ICONS[selectedAccountForDetails.type as keyof typeof ACCOUNT_ICONS] || {
                      icon: 'wallet-outline',
                      color: '#6B7B77',
                      bgColor: '#F4FAF8'
                    };
                    return (
                      <View style={styles.accountDetailRow}>
                        <View style={[styles.iconCircle, { backgroundColor: iconInfo.bgColor, marginRight: 12 }]}>
                          <Ionicons name={iconInfo.icon as any} size={24} color={iconInfo.color} />
                        </View>
                        <View>
                          <Text style={[styles.accountDetailRowTitle, { color: themeColors.text }]}>{selectedAccountForDetails.name}</Text>
                          <Text style={[styles.accountDetailRowBalance, { color: themeColors.textSecondary }]}>
                            Account balance: <Text style={{ color: '#0D8A63', fontWeight: '700' }}>{formatCurrency(accountEndingBalance)}</Text>
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Summary Card */}
                  <View style={[styles.accountSummaryCard, { backgroundColor: isDarkMode ? '#1e2d2a' : '#F4FAF8', borderColor: themeColors.border }]}>
                    <Text style={[styles.accountSummaryPeriodTitle, { color: themeColors.text }]}>
                      {`${MONTHS[currentMonthIndex].substring(0, 3)} 01 - ${MONTHS[currentMonthIndex].substring(0, 3)} ${totalDays}`}
                    </Text>
                    <Text style={[styles.accountSummaryStartingBalance, { color: themeColors.textSecondary }]}>Starting balance {formatCurrency(accountStartingBalance)}</Text>

                    <View style={styles.accountSummaryColumns}>
                      {/* Expense Column */}
                      <View style={styles.accountSummaryColumn}>
                        <Text style={[styles.accountSummaryColumnLabel, { color: themeColors.textSecondary }]}>Expense</Text>
                        <Text style={[styles.accountSummaryColumnValue, { color: '#FF6B6B' }]}>-{formatCurrency(accountPeriodExpense)}</Text>
                        <Text style={[styles.accountSummaryColumnPercentage, { color: themeColors.text }]}>
                          {totalExpense > 0 ? ((accountPeriodExpense / totalExpense) * 100).toFixed(1) : '0.0'}%
                        </Text>
                        <Text style={[styles.accountSummaryColumnSubtext, { color: themeColors.textSecondary }]}>of total expense in this period</Text>
                      </View>
                      {/* Divider vertical line */}
                      <View style={[styles.accountSummaryVerticalDivider, { backgroundColor: themeColors.border }]} />
                      {/* Income Column */}
                      <View style={styles.accountSummaryColumn}>
                        <Text style={[styles.accountSummaryColumnLabel, { color: themeColors.textSecondary }]}>Income</Text>
                        <Text style={[styles.accountSummaryColumnValue, { color: '#0D8A63' }]}>+{formatCurrency(accountPeriodIncome)}</Text>
                        <Text style={[styles.accountSummaryColumnPercentage, { color: themeColors.text }]}>
                          {totalIncome > 0 ? ((accountPeriodIncome / totalIncome) * 100).toFixed(1) : '0.0'}%
                        </Text>
                        <Text style={[styles.accountSummaryColumnSubtext, { color: themeColors.textSecondary }]}>of total income in this period</Text>
                      </View>
                    </View>

                    <View style={[styles.accountSummaryDivider, { backgroundColor: themeColors.border }]} />

                    {/* Transfer info */}
                    <View style={styles.accountSummaryTransferRow}>
                      <Text style={[styles.accountSummaryTransferLabel, { color: themeColors.textSecondary }]}>Transfer into this account</Text>
                      <Text style={[styles.accountSummaryTransferVal, { color: '#0D8A63' }]}>{formatCurrency(accountTransfersIn)}</Text>
                    </View>
                    <View style={styles.accountSummaryTransferRow}>
                      <Text style={[styles.accountSummaryTransferLabel, { color: themeColors.textSecondary }]}>Transfer out to other accounts</Text>
                      <Text style={[styles.accountSummaryTransferVal, { color: '#FF6B6B' }]}>-{formatCurrency(accountTransfersOut)}</Text>
                    </View>

                    <View style={[styles.accountSummaryDivider, { backgroundColor: themeColors.border }]} />

                    {/* Ending Balance */}
                    <View style={styles.accountSummaryEndingRow}>
                      <Text style={[styles.accountSummaryEndingLabel, { color: themeColors.text }]}>Ending balance</Text>
                      <Text style={[styles.accountSummaryEndingVal, { color: '#0D8A63' }]}>{formatCurrency(accountEndingBalance)}</Text>
                    </View>
                  </View>

                  {/* Records Header */}
                  <View style={styles.accountRecordsHeader}>
                    <Text style={[styles.accountRecordsHeaderTitle, { color: themeColors.text }]}>
                      {`${MONTHS[currentMonthIndex].substring(0, 3)} 01 - ${MONTHS[currentMonthIndex].substring(0, 3)} ${totalDays}`} : {accountTxs.length} records
                    </Text>
                    <TouchableOpacity
                      style={styles.accountSortToggleBtn}
                      onPress={() => setAccountSortOrder(accountSortOrder === 'new_to_old' ? 'old_to_new' : 'new_to_old')}
                    >
                      <Ionicons name="list" size={16} color="#00684F" style={{ marginRight: 4 }} />
                      <Text style={styles.accountSortToggleText}>
                        {accountSortOrder === 'new_to_old' ? 'NEW TO OLD' : 'OLD TO NEW'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Records List (Inside the single parent ScrollView) */}
                  <View style={styles.accountRecordsList}>
                    {accountTxs.length === 0 ? (
                      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                        <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>No records for this account in this period.</Text>
                      </View>
                    ) : (
                      accountGroupDates.map(dateStr => {
                        const dateTxs = sortedAccountTxs.filter(t => t.date === dateStr);
                        // Format group date
                        const parts = dateStr.split('-');
                        const y = parseInt(parts[0], 10);
                        const m = parseInt(parts[1], 10) - 1;
                        const d = parseInt(parts[2], 10);
                        const dateObj = new Date(y, m, d);
                        const month = MONTHS[m].substring(0, 3);
                        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const weekday = daysOfWeek[dateObj.getDay()];
                        const headerDate = `${month} ${parts[2]}, ${weekday}`;

                        return (
                          <View key={dateStr} style={styles.accountGroupContainer}>
                            <Text style={[styles.accountGroupDateText, { color: themeColors.textSecondary }]}>{headerDate}</Text>
                            {dateTxs.map(tx => {
                              const iconName = tx.categoryIcon || getCatIcon(tx.category);
                              const catColor = tx.categoryColor || '#6B7B77';
                              return (
                                <View key={tx.id} style={[styles.accountRecordItem, { borderBottomColor: themeColors.divider }]}>
                                  <View style={styles.accountRecordLeft}>
                                    <View style={[styles.accountRecordIconBg, { backgroundColor: `${catColor}15` }]}>
                                      <Ionicons
                                        name={iconName as any}
                                        size={16}
                                        color={catColor}
                                      />
                                    </View>
                                    <View style={styles.accountRecordTextInfo}>
                                      <Text style={[styles.accountRecordCategory, { color: themeColors.text }]}>{tx.category}</Text>
                                      {tx.description ? (
                                        <Text style={[styles.accountRecordDesc, { color: themeColors.textSecondary }]}>“{tx.description}”</Text>
                                      ) : null}
                                    </View>
                                  </View>
                                  <Text style={[
                                    styles.accountRecordAmount,
                                    { color: tx.type === 'income' ? '#0D8A63' : '#FF6B6B' }
                                  ]}>
                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        );
                      })
                    )}
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 28,
    paddingBottom: 24,
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  monthSelectorCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
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
    color: colors.text,
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
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
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
    color: colors.textSecondary,
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
    color: '#D32F2F',
  },
  incomeAmount: {
    color: '#0D8A63',
  },
  totalAmount: {
    color: colors.primary,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownTriggerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  chartSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  chartWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterLabelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  legendContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.primaryLight,
    marginVertical: 16,
  },
  categoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  categoryAmountText: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: colors.background,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 46,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  modalOptionSelected: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: -12,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Empty state card
  emptyStateCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyStateIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },

  // Flow line chart container styles
  chartContainer: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  chartLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width - 72,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  chartLabelText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Calendar styles
  calendarHeaderContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomColor: '#00684F20',
    paddingBottom: 8,
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    height: 52,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: colors.primaryLight,
  },
  calendarCellEmpty: {
    width: `${100 / 7}%`,
    height: 52,
  },
  calendarCellWithTx: {
    backgroundColor: '#00684F06',
  },
  calendarDayNum: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  calendarCellAmt: {
    fontSize: 9,
    fontWeight: '700',
  },
  placeholderDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Details Modal styles
  detailsModalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    height: 340,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  modalTabsContainer: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    flexDirection: 'row',
  },
  modalTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  modalTabButtonActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modalTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalTxsList: {
    flex: 1,
  },
  noTxsText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 24,
    fontSize: 14,
  },
  modalTxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  modalTxLeft: {
    flex: 1,
  },
  modalTxCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  modalTxDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalTxAmount: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Account Details styles
  accountRowClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.background,
    marginTop: 12,
  },
  accountCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  accountCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  accountPeriodInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountPeriodLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  accountPeriodExpenseBox: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  accountPeriodExpenseText: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: '700',
  },
  accountPeriodIncomeBox: {
    borderWidth: 1,
    borderColor: '#0D8A63',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  accountPeriodIncomeText: {
    fontSize: 11,
    color: '#0D8A63',
    fontWeight: '700',
  },

  // Account details modal container styles
  accountModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  accountModalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    height: '92%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  accountModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  accountModalCloseBtn: {
    padding: 4,
    marginRight: 12,
  },
  accountModalHeaderTitleContainer: {
    flex: 1,
  },
  accountModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  accountModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  accountDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  accountDetailRowTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  accountDetailRowBalance: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  accountSummaryCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountSummaryPeriodTitle: {
    fontSize: 13,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  accountSummaryStartingBalance: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  accountSummaryColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  accountSummaryColumn: {
    flex: 1,
    alignItems: 'center',
  },
  accountSummaryColumnLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  accountSummaryColumnValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: colors.text,
  },
  accountSummaryColumnPercentage: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  accountSummaryColumnSubtext: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  accountSummaryVerticalDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
  },
  accountSummaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  accountSummaryTransferRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  accountSummaryTransferLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  accountSummaryTransferVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  accountSummaryEndingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  accountSummaryEndingLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: 'bold',
  },
  accountSummaryEndingVal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  accountRecordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  accountRecordsHeaderTitle: {
    fontSize: 13,
    color: colors.text,
    fontWeight: 'bold',
  },
  accountSortToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  accountSortToggleText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  accountRecordsList: {
    flex: 1,
  },
  accountGroupContainer: {
    marginBottom: 16,
  },
  accountGroupDateText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
  accountRecordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  accountRecordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountRecordIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  accountRecordTextInfo: {
    flex: 1,
  },
  accountRecordCategory: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  accountRecordDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  accountRecordAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
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
});
