import { AccountsSummary } from '@/components/accounts-summary';
import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { useTheme } from '@/context/theme-context';
import { useTransactions } from '@/hooks/useTransactions';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { AddTransactionModal } from '@/components/add-transaction-modal';
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

interface Account {
  id: string;
  name: string;
  balance: number;
  type: string; // 'savings' | 'card' | 'cash'
}

const ACCOUNT_ICONS: Record<string, { icon: string; color: string; bgColor: string }> = {
  savings: { icon: 'cash-outline', color: '#0D8A63', bgColor: '#EAF4F1' },
  card: { icon: 'card-outline', color: '#FFA216', bgColor: '#FFF8E7' },
  cash: { icon: 'wallet-outline', color: '#4D96FF', bgColor: '#EEF5FF' },
};

export default function AccountsScreen() {
  const { currentMonthIndex, transactions } = useTransactions();
  const { isDarkMode, colors } = useTheme();

  // State for accounts list
  const [accounts, setAccounts] = useState<Account[]>([
    { id: '1', name: 'Savings', balance: 8500.00, type: 'savings' },
    { id: '2', name: 'Untitled', balance: 5555.00, type: 'card' },
  ]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountBalance, setAccountBalance] = useState('');
  const [accountType, setAccountType] = useState('savings');
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Compute totals
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Compute income and expenses for current month
  const monthString = (currentMonthIndex + 1).toString().padStart(2, '0');
  const monthPrefix = `2026-${monthString}`;
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(monthPrefix));

  const incomeSoFar = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseSoFar = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddAccount = () => {
    const parsedBalance = parseFloat(accountBalance);
    if (!accountName.trim()) {
      Alert.alert('Invalid Name', 'Please enter an account name.');
      return;
    }
    if (isNaN(parsedBalance)) {
      Alert.alert('Invalid Balance', 'Please enter a valid balance.');
      return;
    }

    const newAccount: Account = {
      id: Math.random().toString(36).substring(2, 9),
      name: accountName,
      balance: parsedBalance,
      type: accountType,
    };

    setAccounts(prev => [...prev, newAccount]);
    setModalVisible(false);
    setAccountName('');
    setAccountBalance('');
    setAccountType('savings');
  };

  const handleDeleteAccount = (id: string, name: string) => {
    Alert.alert(
      'Remove Account',
      `Are you sure you want to remove the account "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setAccounts(prev => prev.filter(acc => acc.id !== id));
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#014134" />

      {/* App Header */}
      <Header title="C-Vault" />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
        <AccountsSummary />

        {/* Accounts List Section */}
        <View style={[styles.sectionHeaderContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>Accounts</Text>
        </View>

        {accounts.map((acc, index) => {
          const config = ACCOUNT_ICONS[acc.type] || ACCOUNT_ICONS.savings;
          return (
            <View key={acc.id} style={[styles.accountCard, { backgroundColor: colors.card }, index === 0 && { marginTop: 0 }]}>
              <View style={styles.accountLeft}>
                <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? colors.primaryLight : config.bgColor }]}>
                  <Ionicons name={config.icon as any} size={22} color={isDarkMode ? colors.primary : config.color} />
                </View>
                <View style={styles.accountMeta}>
                  <Text style={[styles.accountName, { color: colors.text }]}>{acc.name}</Text>
                  <Text style={[styles.accountBalanceLabel, { color: colors.textSecondary }]}>
                    Balance: <Text style={styles.balanceHighlight}>{formatCurrency(acc.balance)}</Text>
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteAccount(acc.id, acc.name)}
                style={styles.moreButton}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#8E9E9A" />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add Account Button */}
        <Button
          title="ADD NEW ACCOUNT"
          icon="add"
          onPress={() => setModalVisible(true)}
          style={styles.addButtonMargin}
        />

        <View style={{ height: 90 }} />
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

      {/* Add Account Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Account</Text>

            <TextInput
              style={styles.input}
              placeholder="Account Name"
              placeholderTextColor="#8E9E9A"
              value={accountName}
              onChangeText={setAccountName}
            />

            <TextInput
              style={styles.input}
              placeholder="Initial Balance"
              placeholderTextColor="#8E9E9A"
              keyboardType="numeric"
              value={accountBalance}
              onChangeText={setAccountBalance}
            />

            {/* Type selector */}
            <Text style={styles.typeLabel}>Account Type</Text>
            <View style={styles.typeSelectorRow}>
              {(['savings', 'card', 'cash'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    accountType === type && styles.typeOptionSelected,
                  ]}
                  onPress={() => setAccountType(type)}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      accountType === type && styles.typeOptionTextSelected,
                    ]}
                  >
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleAddAccount}
              >
                <Text style={styles.modalBtnSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAF8',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeaderContainer: {
    marginTop: 24,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2F1',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00684F',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountMeta: {
    justifyContent: 'center',
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C2A27',
  },
  accountBalanceLabel: {
    fontSize: 12,
    color: '#6B7B77',
    marginTop: 2,
  },
  balanceHighlight: {
    color: '#0D8A63',
    fontWeight: '600',
  },
  moreButton: {
    padding: 4,
  },
  addButtonMargin: {
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    color: '#1C2A27',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D7E5E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1C2A27',
    backgroundColor: '#F4FAF8',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7B77',
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D7E5E0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F4FAF8',
  },
  typeOptionSelected: {
    borderColor: '#00684F',
    backgroundColor: '#EAF4F1',
  },
  typeOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7B77',
  },
  typeOptionTextSelected: {
    color: '#00684F',
    fontWeight: '700',
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
    backgroundColor: '#ECEFF1',
  },
  modalBtnCancelText: {
    color: '#6B7B77',
    fontWeight: '600',
    fontSize: 14,
  },
  modalBtnSave: {
    backgroundColor: '#00684F',
  },
  modalBtnSaveText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
    shadowRadius: 6,
    elevation: 6,
  },
});
