import { useTheme } from '@/context/theme-context';
import { useTransactions, type Transaction } from '@/hooks/useTransactions';
import { useVault } from '@/context/vault-context';
import { accountRepository } from '@/db/repositories/accountRepository';
import { categoryRepository } from '@/db/repositories/categoryRepository';
import { type Category } from '@/db/models/category';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  PanResponder,
} from 'react-native';

const { width } = Dimensions.get('window');

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  defaultAccount?: string;
  transactionToEdit?: Transaction | null;
}

export function AddTransactionModal({ visible, onClose, defaultAccount, transactionToEdit }: AddTransactionModalProps) {
  const { colors, isDarkMode } = useTheme();
  const { addTransaction, deleteTransaction } = useTransactions();
  const { currentAccount } = useVault();
  const userId = currentAccount?.id || 'mock-user-id';

  // Tab State
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'transfer'>('expense');

  // Fields State
  const [account, setAccount] = useState('');
  const [category, setCategory] = useState('');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [amountExpr, setAmountExpr] = useState('0');
  const [dbAccounts, setDbAccounts] = useState<string[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);

  // Load dynamic accounts & categories from SQLite database
  useEffect(() => {
    if (visible) {
      const loadModalData = async () => {
        try {
          // Load accounts
          const accs = await accountRepository.getAll(userId);
          const names = accs.map(a => a.name);
          setDbAccounts(names);
          
          if (!transactionToEdit) {
            if (names.length > 0) {
              if (defaultAccount && names.includes(defaultAccount)) {
                setAccount(defaultAccount);
              } else if (names.includes(account)) {
                // keep current
              } else {
                setAccount(names[0]);
              }

              if (!names.includes(fromAccount)) {
                setFromAccount(names[0]);
              }
              if (!names.includes(toAccount)) {
                setToAccount(names[1] || names[0]);
              }
            } else {
              setAccount('');
              setFromAccount('');
              setToAccount('');
            }
          }

          // Load categories
          const cats = await categoryRepository.getAll(userId);
          setDbCategories(cats);
          
          if (!transactionToEdit) {
            // Select default category
            const filtered = cats.filter(c => c.type === activeTab);
            if (filtered.length > 0) {
              if (!filtered.some(c => c.name === category)) {
                setCategory(filtered[0].name);
              }
            } else {
              setCategory('');
            }
          }
        } catch (err) {
          console.error('Failed to load accounts and categories for transaction modal:', err);
          setDbAccounts([]);
          setDbCategories([]);
        }
      };
      loadModalData();
    }
  }, [visible, userId, defaultAccount, activeTab, transactionToEdit]);

  // Pre-fill fields for editing
  useEffect(() => {
    if (visible && transactionToEdit) {
      setActiveTab(transactionToEdit.type);
      setAccount(transactionToEdit.accountName || '');
      setCategory(transactionToEdit.category);
      setNotes(transactionToEdit.description || '');
      setAmountExpr(transactionToEdit.amount.toString());
      if (transactionToEdit.date) {
        const d = new Date(transactionToEdit.date);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
        }
      }
    } else if (visible && !transactionToEdit) {
      setAmountExpr('0');
      setNotes('');
      setSelectedDate(new Date());
    }
  }, [visible, transactionToEdit]);

  // Date Picker States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());

  // Time Picker States
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(6);
  const [selectedMinute, setSelectedMinute] = useState(20);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');

  const dragTargetRef = React.useRef<'hour' | 'minute' | null>(null);

  const handleClockTouch = (locationX: number, locationY: number, isNewTouch = false) => {
    const dx = locationX - 100;
    const dy = locationY - 100;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angleDeg < 0) {
      angleDeg += 360;
    }

    if (isNewTouch) {
      // Shorter Hour hand is targeted if touch is close to center (radius < 56)
      dragTargetRef.current = distance < 56 ? 'hour' : 'minute';
    }

    if (dragTargetRef.current === 'hour') {
      let hour = Math.round(angleDeg / 30);
      if (hour === 0) hour = 12;
      if (hour > 12) hour = 12;
      setSelectedHour(hour);
    } else {
      let minute = Math.round(angleDeg / 6);
      if (minute === 60) minute = 0;
      setSelectedMinute(minute);
    }
  };

  const clockPanResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        handleClockTouch(locationX, locationY, true);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        handleClockTouch(locationX, locationY, false);
      },
    })
  ).current;

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleMonthChange = (direction: number) => {
    let nextMonth = pickerMonth + direction;
    if (nextMonth < 0) nextMonth = 11;
    if (nextMonth > 11) nextMonth = 0;
    setPickerMonth(nextMonth);
  };

  const renderPickerDays = () => {
    const year = new Date().getFullYear();
    const firstDayIndex = new Date(year, pickerMonth, 1).getDay();
    const totalDays = new Date(year, pickerMonth + 1, 0).getDate();

    const days: React.ReactNode[] = [];

    // Empty spaces for first week offset
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<View key={`empty-${i}`} style={styles.pickerDayBtnEmpty} />);
    }

    // Day buttons
    for (let day = 1; day <= totalDays; day++) {
      const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === pickerMonth;
      days.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[styles.pickerDayBtn, isSelected && styles.pickerDayBtnSelected]}
          onPress={() => {
            const newDate = new Date(selectedDate);
            newDate.setMonth(pickerMonth);
            newDate.setDate(day);
            setSelectedDate(newDate);
          }}
        >
          <Text style={[
            styles.pickerDayText,
            { color: colors.text },
            isSelected && styles.pickerDayTextSelected,
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }
    return days;
  };

  // Selection overlays visibility
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [pickerType, setPickerType] = useState<'account' | 'fromAccount' | 'toAccount'>('account');

  // Handle calculator key press
  const handleKeyPress = (val: string) => {
    if (val === 'C') {
      setAmountExpr('0');
      return;
    }

    if (val === 'backspace') {
      if (amountExpr.length <= 1) {
        setAmountExpr('0');
      } else {
        setAmountExpr(amountExpr.slice(0, -1));
      }
      return;
    }

    if (val === '=') {
      evaluateExpression();
      return;
    }

    // Append to expression
    if (amountExpr === '0' && !['+', '-', '*', '/', '.'].includes(val)) {
      setAmountExpr(val);
    } else {
      // Prevent consecutive operators
      const lastChar = amountExpr.slice(-1);
      if (['+', '-', '*', '/'].includes(lastChar) && ['+', '-', '*', '/'].includes(val)) {
        setAmountExpr(amountExpr.slice(0, -1) + val);
      } else {
        setAmountExpr(amountExpr + val);
      }
    }
  };

  const evaluateExpression = (): number => {
    try {
      const cleanExpr = amountExpr.replace(/×/g, '*').replace(/÷/g, '/');

      // Simple math evaluator using Function
      if (!/^[0-9.+\-*/\s]+$/.test(cleanExpr)) {
        return 0;
      }

      const result = new Function(`return (${cleanExpr})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        const rounded = Math.round(result * 100) / 100;
        setAmountExpr(rounded.toString());
        return Math.max(0, rounded);
      }
      return 0;
    } catch (e) {
      Alert.alert('Calculation Error', 'Invalid arithmetic expression.');
      return 0;
    }
  };

  const handleSave = async () => {
    const finalAmount = evaluateExpression();
    if (finalAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero.');
      return;
    }

    const monthStr = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = selectedDate.getDate().toString().padStart(2, '0');
    const todayStr = `${selectedDate.getFullYear()}-${monthStr}-${dayStr}`;

    // Delete the old transaction first if we're editing
    if (transactionToEdit) {
      await deleteTransaction(transactionToEdit);
    }

    if (activeTab === 'transfer') {
      if (!fromAccount || !toAccount) {
        Alert.alert('No Accounts Available', 'Please create at least two accounts before performing a transfer.');
        return;
      }
      if (fromAccount === toAccount) {
        Alert.alert('Invalid Transfer', 'Source and destination accounts must be different.');
        return;
      }
      // Add as Expense from source account
      await addTransaction({
        type: 'expense',
        category: 'Transfer',
        amount: finalAmount,
        date: todayStr,
        description: notes ? `Transfer to ${toAccount}: ${notes}` : `Transfer to ${toAccount}`,
        accountName: fromAccount,
      });

      // Add as Income to destination account
      await addTransaction({
        type: 'income',
        category: 'Transfer',
        amount: finalAmount,
        date: todayStr,
        description: notes ? `Transfer from ${fromAccount}: ${notes}` : `Transfer from ${fromAccount}`,
        accountName: toAccount,
      });
    } else {
      if (!account) {
        Alert.alert('No Account Selected', 'Please create an account before adding a transaction.');
        return;
      }
      await addTransaction({
        type: activeTab,
        category: category,
        amount: finalAmount,
        date: todayStr,
        description: notes,
        accountName: account,
      });
    }

    // Reset states
    setAmountExpr('0');
    setNotes('');
    onClose();
  };

  const openAccountPicker = (type: 'account' | 'fromAccount' | 'toAccount') => {
    setPickerType(type);
    setShowAccountPicker(true);
  };

  // Keyboard Rows
  const keypad = [
    ['+', '7', '8', '9'],
    ['-', '4', '5', '6'],
    ['*', '1', '2', '3'],
    ['/', '0', '.', '='],
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {transactionToEdit ? 'Edit Transaction' : 'Add Transaction'}
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Calculator Output View */}
          <View style={[styles.calcOutputContainer, { borderColor: colors.border }]}>
            <Text style={[styles.calcExprText, { color: colors.text }]} numberOfLines={1}>
              {amountExpr}
            </Text>
            <TouchableOpacity onPress={() => handleKeyPress('backspace')} style={styles.backspaceBtn}>
              <Ionicons name="backspace-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Keypad Grid */}
          <View style={styles.keypadGrid}>
            {keypad.map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((btn) => {
                  const isOperator = ['+', '-', '*', '/'].includes(btn);
                  const isEquals = btn === '=';

                  // Label transformations for cleaner display
                  let label = btn;
                  if (btn === '*') label = '×';
                  if (btn === '/') label = '÷';

                  return (
                    <TouchableOpacity
                      key={btn}
                      style={[
                        styles.keypadBtn,
                        { borderColor: colors.border },
                        isOperator && { backgroundColor: isDarkMode ? '#283B38' : '#D0DFDC' },
                        isEquals && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => handleKeyPress(btn)}
                    >
                      <Text
                        style={[
                          styles.keypadBtnText,
                          { color: isEquals ? '#FFFFFF' : colors.text },
                          isOperator && { color: colors.primary, fontWeight: '700' },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Notes Input */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Notes</Text>
          <TextInput
            style={[
              styles.notesInput,
              {
                borderColor: colors.border,
                backgroundColor: isDarkMode ? '#243330' : '#F4FAF8',
                color: colors.text,
              },
            ]}
            placeholder="Add optional notes..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          {/* Transaction Type Segmented Control */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Transaction Type</Text>
          <View style={[styles.tabsContainer, { backgroundColor: isDarkMode ? '#1D2E2B' : '#EAF4F1' }]}>
            {(['income', 'expense', 'transfer'] as const).map((tab) => {
              const isSelected = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabButton,
                    isSelected && { backgroundColor: isDarkMode ? colors.primary : '#FFFFFF' },
                  ]}
                  onPress={() => {
                    setActiveTab(tab);
                    // Update default category based on type
                    setCategory(tab === 'income' ? 'Salary' : 'Food');
                  }}
                >
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={isDarkMode ? '#FFFFFF' : '#00684F'}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.tabButtonText,
                      { color: isSelected ? (isDarkMode ? '#FFFFFF' : '#00684F') : colors.textSecondary },
                    ]}
                  >
                    {tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selectors Grid */}
          <View style={styles.selectorsGrid}>
            {activeTab === 'transfer' ? (
              <>
                {/* From Account Selector */}
                <View style={styles.selectorCol}>
                  <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>From</Text>
                  <TouchableOpacity
                    style={[styles.selectorButton, { borderColor: colors.border }]}
                    onPress={() => openAccountPicker('fromAccount')}
                  >
                    <Ionicons name="wallet-outline" size={18} color={fromAccount ? colors.primary : '#FF6B6B'} />
                    <Text style={[styles.selectorValueText, { color: fromAccount ? colors.text : '#FF6B6B', fontSize: fromAccount ? 15 : 12 }]} numberOfLines={1}>
                      {fromAccount || 'Create Account'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* To Account Selector */}
                <View style={styles.selectorCol}>
                  <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>To</Text>
                  <TouchableOpacity
                    style={[styles.selectorButton, { borderColor: colors.border }]}
                    onPress={() => openAccountPicker('toAccount')}
                  >
                    <Ionicons name="wallet-outline" size={18} color={toAccount ? colors.primary : '#FF6B6B'} />
                    <Text style={[styles.selectorValueText, { color: toAccount ? colors.text : '#FF6B6B', fontSize: toAccount ? 15 : 12 }]} numberOfLines={1}>
                      {toAccount || 'Create Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Account Selector */}
                <View style={styles.selectorCol}>
                  <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Account</Text>
                  <TouchableOpacity
                    style={[styles.selectorButton, { borderColor: colors.border }]}
                    onPress={() => openAccountPicker('account')}
                  >
                    <Ionicons name="wallet-outline" size={18} color={account ? colors.primary : '#FF6B6B'} />
                    <Text style={[styles.selectorValueText, { color: account ? colors.text : '#FF6B6B', fontSize: account ? 15 : 12 }]} numberOfLines={1}>
                      {account || 'Create Account'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Category Selector */}
                <View style={styles.selectorCol}>
                  <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Category</Text>
                  <TouchableOpacity
                    style={[styles.selectorButton, { borderColor: colors.border }]}
                    onPress={() => setShowCategoryPicker(true)}
                  >
                    <Ionicons name="pricetag-outline" size={18} color={category ? colors.primary : '#FF6B6B'} />
                    <Text style={[styles.selectorValueText, { color: category ? colors.text : '#FF6B6B', fontSize: category ? 15 : 12 }]} numberOfLines={1}>
                      {category || 'Create Category'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Date & Time Grid */}
          <View style={styles.selectorsGrid}>
            {/* Date Selector */}
            <View style={styles.selectorCol}>
              <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Date</Text>
              <TouchableOpacity
                style={[styles.selectorButton, { borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.selectorValueText, { color: colors.text }]} numberOfLines={1}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Time Selector */}
            <View style={styles.selectorCol}>
              <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Time</Text>
              <TouchableOpacity
                style={[styles.selectorButton, { borderColor: colors.border }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.selectorValueText, { color: colors.text }]} numberOfLines={1}>
                  {selectedHour}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Pinned Bottom Cancel/Save Action Buttons */}
        <View style={[styles.bottomActionsRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.cancelActionButton, { backgroundColor: isDarkMode ? '#243330' : '#EAF4F1' }]} 
            onPress={onClose}
          >
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.saveActionButton, { backgroundColor: colors.primary }]} 
            onPress={handleSave}
          >
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>SAVE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Picker Modal overlay */}
      <Modal visible={showAccountPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowAccountPicker(false)}
        >
          <View style={[styles.pickerCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Account</Text>
            {dbAccounts.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Ionicons name="alert-circle-outline" size={36} color="#FF6B6B" style={{ marginBottom: 8 }} />
                <Text style={{ color: colors.text, textAlign: 'center', fontSize: 15, fontWeight: '600' }}>
                  No Accounts Found
                </Text>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13, marginTop: 4, paddingHorizontal: 16 }}>
                  Please close this modal and add an account under the Accounts tab first.
                </Text>
              </View>
            ) : (
              dbAccounts.map((acc) => (
                <TouchableOpacity
                  key={acc}
                  style={[styles.pickerOption, { borderBottomColor: colors.divider }]}
                  onPress={() => {
                    if (pickerType === 'account') setAccount(acc);
                    if (pickerType === 'fromAccount') setFromAccount(acc);
                    if (pickerType === 'toAccount') setToAccount(acc);
                    setShowAccountPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, { color: colors.text }]}>{acc}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Picker Modal overlay */}
      <Modal visible={showCategoryPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={[styles.pickerCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Category</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {dbCategories.filter(c => c.type === activeTab).length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Ionicons name="alert-circle-outline" size={36} color="#FF6B6B" style={{ marginBottom: 8 }} />
                  <Text style={{ color: colors.text, textAlign: 'center', fontSize: 15, fontWeight: '600' }}>
                    No Categories Found
                  </Text>
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13, marginTop: 4, paddingHorizontal: 16 }}>
                    No categories found for {activeTab}. Please add a category under Settings first.
                  </Text>
                </View>
              ) : (
                dbCategories
                  .filter(c => c.type === activeTab)
                  .map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.pickerOption, { borderBottomColor: colors.divider }]}
                      onPress={() => {
                        setCategory(cat.name);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerOptionText, { color: colors.text }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom Calendar Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.customDatePickerCard, { backgroundColor: isDarkMode ? '#323232' : colors.card }]}>
            {/* Header */}
            <View style={[styles.customDatePickerHeader, { backgroundColor: isDarkMode ? '#484848' : '#00684F' }]}>
              <Text style={[styles.customDatePickerHeaderYear, { color: isDarkMode ? '#B0B0B0' : 'rgba(255,255,255,0.75)' }]}>{selectedDate.getFullYear()}</Text>
              <Text style={styles.customDatePickerHeaderDate}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
            </View>

            {/* Month Control */}
            <View style={styles.customDatePickerMonthCtrl}>
              <TouchableOpacity onPress={() => handleMonthChange(-1)} style={styles.chevronControlBtn}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.customDatePickerMonthLabel, { color: colors.text }]}>
                {MONTHS[pickerMonth]} {new Date().getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => handleMonthChange(1)} style={styles.chevronControlBtn}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Weekdays Row */}
            <View style={styles.customDatePickerWeekdays}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <Text key={idx} style={[styles.customDatePickerWeekdayText, { color: colors.textSecondary }]}>{day}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.customDatePickerDaysGrid}>
              {renderPickerDays()}
            </View>

            {/* Action Row */}
            <View style={[styles.customDatePickerActions, { borderTopColor: isDarkMode ? '#404040' : colors.divider }]}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.customDatePickerActionBtn}>
                <Text style={[styles.customDatePickerActionText, { color: colors.primary }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.customDatePickerActionBtn}>
                <Text style={[styles.customDatePickerActionText, { color: colors.primary }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Time Picker Modal */}
      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.setTimeCard, { backgroundColor: colors.card }]}>
            {/* Analog Clock */}
            <View style={styles.setTimeClockArea}>
              <View style={[
                styles.setTimeClockOuter,
                { borderColor: isDarkMode ? '#2ED8A5' : '#00684F', backgroundColor: isDarkMode ? '#1A2E2B' : '#F4FAF8' }
              ]}>
                <View style={styles.setTimeClockFace} {...clockPanResponder.panHandlers}>
                  {/* Tick marks */}
                  {Array.from({ length: 60 }).map((_, i) => {
                    const isHourTick = i % 5 === 0;
                    const tickAngle = (i * 6 * Math.PI) / 180;
                    const outerR = 104;
                    const innerR = isHourTick ? 91 : 98;
                    const x1 = outerR * Math.sin(tickAngle);
                    const y1 = -outerR * Math.cos(tickAngle);
                    const x2 = innerR * Math.sin(tickAngle);
                    const y2 = -innerR * Math.cos(tickAngle);
                    const length = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
                    const tickRotation = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    return (
                      <View
                        key={`tick-${i}`}
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          width: length,
                          height: isHourTick ? 2 : 1,
                          backgroundColor: isHourTick ? colors.text : colors.textSecondary,
                          left: '50%',
                          top: '50%',
                          marginLeft: midX - length / 2,
                          marginTop: midY - (isHourTick ? 1 : 0.5),
                          transform: [{ rotate: `${tickRotation}deg` }],
                        }}
                      />
                    );
                  })}

                  {/* Hour numbers */}
                  {([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const).map((h) => {
                    const angle = (h * 30 * Math.PI) / 180;
                    const radius = 76;
                    const x = radius * Math.sin(angle);
                    const y = -radius * Math.cos(angle);
                    return (
                      <View
                        key={h}
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          width: 26,
                          height: 26,
                          justifyContent: 'center',
                          alignItems: 'center',
                          left: '50%',
                          top: '50%',
                          marginLeft: x - 13,
                          marginTop: y - 13,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                          {h}
                        </Text>
                      </View>
                    );
                  })}

                  {/* Hour Hand */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      width: 5,
                      height: 56,
                      bottom: '50%',
                      left: '50%',
                      marginLeft: -2.5,
                      borderRadius: 3,
                      backgroundColor: colors.text,
                      transformOrigin: 'bottom center',
                      transform: [{ rotate: `${(selectedHour % 12) * 30 + (selectedMinute / 60) * 30}deg` }],
                    }}
                  />

                  {/* Minute Hand */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      width: 3,
                      height: 82,
                      bottom: '50%',
                      left: '50%',
                      marginLeft: -1.5,
                      borderRadius: 2,
                      backgroundColor: colors.primary,
                      transformOrigin: 'bottom center',
                      transform: [{ rotate: `${selectedMinute * 6}deg` }],
                    }}
                  />

                  {/* Center dot */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.primary,
                      zIndex: 10,
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Spinners Row */}
            <View style={styles.setTimeSpinnersRow}>
              {/* Hour */}
              <View style={styles.setTimeSpinnerBox}>
                <TouchableOpacity onPress={() => setSelectedHour(h => h === 12 ? 1 : h + 1)} style={styles.setTimeSpinnerArrow}>
                  <Ionicons name="chevron-up" size={18} color={colors.primary} />
                </TouchableOpacity>
                <View style={[styles.setTimeSpinnerValueBox, { backgroundColor: isDarkMode ? '#1D2E2B' : '#EAF4F1', borderColor: colors.divider }]}>
                  <Text style={[styles.setTimeSpinnerValue, { color: colors.text }]}>
                    {selectedHour.toString().padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedHour(h => h === 1 ? 12 : h - 1)} style={styles.setTimeSpinnerArrow}>
                  <Ionicons name="chevron-down" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.setTimeSpinnerColon, { color: colors.text }]}>:</Text>

              {/* Minute */}
              <View style={styles.setTimeSpinnerBox}>
                <TouchableOpacity onPress={() => setSelectedMinute(m => m === 59 ? 0 : m + 1)} style={styles.setTimeSpinnerArrow}>
                  <Ionicons name="chevron-up" size={18} color={colors.primary} />
                </TouchableOpacity>
                <View style={[styles.setTimeSpinnerValueBox, { backgroundColor: isDarkMode ? '#1D2E2B' : '#EAF4F1', borderColor: colors.divider }]}>
                  <Text style={[styles.setTimeSpinnerValue, { color: colors.text }]}>
                    {selectedMinute.toString().padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedMinute(m => m === 0 ? 59 : m - 1)} style={styles.setTimeSpinnerArrow}>
                  <Ionicons name="chevron-down" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* AM/PM */}
              <View style={[styles.setTimeSpinnerBox, { marginLeft: 10 }]}>
                <TouchableOpacity onPress={() => setSelectedPeriod(p => p === 'AM' ? 'PM' : 'AM')} style={styles.setTimeSpinnerArrow}>
                  <Ionicons name="chevron-up" size={18} color={colors.primary} />
                </TouchableOpacity>
                <View style={[styles.setTimeSpinnerValueBox, { backgroundColor: isDarkMode ? '#1D2E2B' : '#EAF4F1', borderColor: colors.divider }]}>
                  <Text style={[styles.setTimeSpinnerValue, { color: colors.text }]}>{selectedPeriod}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedPeriod(p => p === 'AM' ? 'PM' : 'AM')} style={styles.setTimeSpinnerArrow}>
                  <Ionicons name="chevron-down" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Actions — mirrors calendar action row */}
            <View style={[styles.customDatePickerActions, { borderTopColor: isDarkMode ? '#2D3D3A' : colors.divider }]}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.customDatePickerActionBtn}>
                <Text style={[styles.customDatePickerActionText, { color: colors.primary }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.customDatePickerActionBtn}>
                <Text style={[styles.customDatePickerActionText, { color: colors.primary }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectorsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  selectorCol: {
    flex: 1,
  },
  fullWidthSelector: {
    width: '100%',
    marginBottom: 14,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  selectorValueText: {
    fontSize: 15,
    fontWeight: '700',
    maxWidth: '85%',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    height: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  calcOutputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  calcExprText: {
    fontSize: 32,
    fontWeight: '500',
    flex: 1,
  },
  backspaceBtn: {
    padding: 4,
  },
  keypadGrid: {
    flexDirection: 'column',
    gap: 6,
    marginBottom: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 6,
  },
  keypadBtn: {
    flex: 1,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadBtnText: {
    fontSize: 20,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCard: {
    width: width * 0.8,
    borderRadius: 16,
    padding: 20,
    maxHeight: 400,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
    textAlign: 'center',
  },
  pickerOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  customDatePickerCard: {
    width: width * 0.85,
    backgroundColor: '#323232',
    borderRadius: 8,
    overflow: 'hidden',
  },
  customDatePickerHeader: {
    backgroundColor: '#484848',
    padding: 20,
  },
  customDatePickerHeaderYear: {
    color: '#B0B0B0',
    fontSize: 14,
    fontWeight: '600',
  },
  customDatePickerHeaderDate: {
    color: '#2ED8A5',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  customDatePickerMonthCtrl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  customDatePickerMonthLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  chevronControlBtn: {
    padding: 6,
  },
  customDatePickerWeekdays: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  customDatePickerWeekdayText: {
    flex: 1,
    color: '#888888',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  customDatePickerDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  pickerDayBtn: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  pickerDayBtnEmpty: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  pickerDayBtnSelected: {
    backgroundColor: '#2ED8A5',
  },
  pickerDayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  pickerDayTextSelected: {
    color: '#000000',
    fontWeight: '700',
  },
  customDatePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 12,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  customDatePickerActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  customDatePickerActionText: {
    color: '#2ED8A5',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 44,
    borderTopWidth: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelActionButton: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  saveActionButton: {},
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  setTimeCard: {
    width: width * 0.85,
    borderRadius: 8,
    overflow: 'hidden',
  },
  setTimeHeader: {
    padding: 20,
  },
  setTimeHeaderLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  setTimeHeaderTime: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
  },
  setTimeClockArea: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  setTimeClockOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  setTimeClockFace: {
    width: 210,
    height: 210,
    borderRadius: 105,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  setTimeSpinnersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 4,
  },
  setTimeSpinnerBox: {
    alignItems: 'center',
    gap: 2,
  },
  setTimeSpinnerArrow: {
    padding: 4,
  },
  setTimeSpinnerValueBox: {
    width: 60,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  setTimeSpinnerValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  setTimeSpinnerColon: {
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 4,
    marginTop: -4,
  },
  setTimeConfirmBtn: {},
  setTimeConfirmText: {},
  setTimeCancelText: {},
});
