import { AccountsSummary } from '@/components/accounts-summary';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { useTheme } from '@/context/theme-context';
import { useVault } from '@/context/vault-context';
import { accountRepository } from '@/db/repositories/accountRepository';
import { useTransactions } from '@/hooks/useTransactions';
import { sendLocalNotification } from '@/utils/notifications';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Account {
  id: string;
  name: string;
  balance: number;
  type: string; // 'cash' | 'card' | 'piggybank' | 'visa'
}

const ACCOUNT_ICONS: Record<string, { icon: string; color: string; bgColor: string }> = {
  cash: { icon: 'cash', color: '#0D8A63', bgColor: '#EAF4F1' },
  card: { icon: 'credit-card', color: '#4D96FF', bgColor: '#EEF5FF' },
  piggybank: { icon: 'piggy-bank', color: '#FF6B6B', bgColor: '#FFEAEA' },
  visa: { icon: 'credit-card-outline', color: '#1A1F71', bgColor: '#E2ECFC' },
};

const UI_TO_DB_TYPE = {
  cash: 'cash',
  card: 'checking',
  piggybank: 'savings',
  visa: 'credit',
} as const;

const DB_TO_UI_TYPE = {
  cash: 'cash',
  checking: 'card',
  savings: 'piggybank',
  credit: 'visa',
} as const;

export default function AccountsScreen() {
  const { currentMonthIndex } = useTransactions();
  const { isDarkMode, colors } = useTheme();
  const { currentAccount } = useVault();
  const userId = currentAccount?.id || 'mock-user-id';

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);

  // Edit / Form states
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountName, setAccountName] = useState('');
  const [accountBalance, setAccountBalance] = useState('');
  const [accountType, setAccountType] = useState<keyof typeof UI_TO_DB_TYPE>('cash');

  // Load accounts from SQLite
  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const dbAccounts = await accountRepository.getAll(userId);
      const mapped: Account[] = dbAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        balance: acc.balance,
        type: DB_TO_UI_TYPE[acc.type as keyof typeof DB_TO_UI_TYPE] || 'cash',
      }));
      setAccounts(mapped);
    } catch (err) {
      console.error('Failed to load accounts from database:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Refresh whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts])
  );

  // Compute totals
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setAccountName('');
    setAccountBalance('');
    setAccountType('cash');
    setModalVisible(true);
  };

  const handleOpenEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setAccountName(acc.name);
    setAccountBalance(acc.balance.toString());
    setAccountType(acc.type as keyof typeof UI_TO_DB_TYPE);
    setOptionsModalVisible(false);
    setModalVisible(true);
  };

  const handleSaveAccount = async () => {
    const trimmedName = accountName.trim();
    const parsedBalance = parseFloat(accountBalance);

    if (!trimmedName) {
      Alert.alert('Invalid Name', 'Please enter an account name.');
      return;
    }
    if (isNaN(parsedBalance)) {
      Alert.alert('Invalid Balance', 'Please enter a valid balance.');
      return;
    }

    try {
      if (editingAccount) {
        // Update Account
        await accountRepository.update({
          id: editingAccount.id,
          user_id: userId,
          name: trimmedName,
          balance: parsedBalance,
          type: UI_TO_DB_TYPE[accountType] || 'checking',
          sync_status: 'pending',
        });
      } else {
        // Create Account
        await accountRepository.insert({
          id: 'acc-usr-' + Math.random().toString(36).substring(2, 9),
          user_id: userId,
          name: trimmedName,
          balance: parsedBalance,
          type: UI_TO_DB_TYPE[accountType] || 'checking',
          sync_status: 'pending',
        });
      }
      setModalVisible(false);
      await loadAccounts();
      
      // Notify user of successful save
      const message = editingAccount 
        ? `Account "${trimmedName}" was successfully updated.`
        : `Account "${trimmedName}" was successfully created.`;
      await sendLocalNotification('Account Saved 💾', message);
    } catch (err) {
      console.error('Failed to save account:', err);
      Alert.alert('Error', 'An error occurred while saving the account.');
    }
  };

  const handleDeleteAccount = (acc: Account) => {
    setOptionsModalVisible(false);
    Alert.alert(
      'Remove Account',
      `Are you sure you want to remove the account "${acc.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await accountRepository.delete(acc.id);
              await loadAccounts();
            } catch (err) {
              console.error('Failed to delete account:', err);
              Alert.alert('Error', 'Could not delete the account.');
            }
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
        <AccountsSummary totalBalance={totalBalance} />

        {/* Accounts List Section */}
        <View style={[styles.sectionHeaderContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>Accounts</Text>
        </View>

        {loading && accounts.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : accounts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={48} color={colors.border} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No accounts created yet.</Text>
          </View>
        ) : (
          accounts.map((acc, index) => {
            const config = ACCOUNT_ICONS[acc.type] || ACCOUNT_ICONS.cash;
            return (
              <TouchableOpacity
                key={acc.id}
                style={[styles.accountCard, { backgroundColor: colors.card }, index === 0 && { marginTop: 0 }]}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedAccount(acc);
                  setAddModalVisible(true);
                }}
              >
                <View style={styles.accountLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? colors.primaryLight : config.bgColor }]}>
                    <MaterialCommunityIcons name={config.icon as any} size={22} color={isDarkMode ? colors.primary : config.color} />
                  </View>
                  <View style={styles.accountMeta}>
                    <Text style={[styles.accountName, { color: colors.text }]}>{acc.name}</Text>
                    <Text style={[styles.accountBalanceLabel, { color: colors.textSecondary }]}>
                      Balance: <Text style={styles.balanceHighlight}>{formatCurrency(acc.balance)}</Text>
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedAccount(acc);
                    setOptionsModalVisible(true);
                  }}
                  style={styles.moreButton}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color="#8E9E9A" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}

        {/* Add Account Button */}
        <Button
          title="ADD NEW ACCOUNT"
          icon="add"
          onPress={handleOpenAddModal}
          style={styles.addButtonMargin}
        />

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={handleOpenAddModal}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={addModalVisible}
        onClose={async () => {
          setAddModalVisible(false);
          await loadAccounts();
        }}
        defaultAccount={selectedAccount?.name}
      />

      {/* Options Menu Modal */}
      <Modal
        visible={optionsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOptionsModalVisible(false)}
        >
          <View style={[styles.optionsContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.optionsTitle, { color: colors.text }]}>
              {selectedAccount?.name}
            </Text>
            <Text style={[styles.optionsSubtitle, { color: colors.textSecondary }]}>
              Manage this financial account
            </Text>

            <TouchableOpacity
              style={[styles.optionsBtn, { borderBottomColor: colors.border }]}
              onPress={() => {
                setOptionsModalVisible(false);
                setAddModalVisible(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.optionsBtnText, { color: colors.text }]}>Add Transaction</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionsBtn, { borderBottomColor: colors.border }]}
              onPress={() => selectedAccount && handleOpenEditModal(selectedAccount)}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={[styles.optionsBtnText, { color: colors.text }]}>Edit Account Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionsBtn, styles.deleteOptionBtn, { borderBottomColor: colors.border }]}
              onPress={() => selectedAccount && handleDeleteAccount(selectedAccount)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              <Text style={[styles.optionsBtnText, { color: '#FF6B6B' }]}>Delete Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionsCancelBtn, { backgroundColor: isDarkMode ? '#243330' : '#ECEFF1' }]}
              onPress={() => setOptionsModalVisible(false)}
            >
              <Text style={[styles.optionsCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add/Edit Account Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingAccount ? 'Edit Account' : 'Add New Account'}
            </Text>

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: isDarkMode ? '#243330' : '#F4FAF8' }]}
              placeholder="Account Name"
              placeholderTextColor="#8E9E9A"
              value={accountName}
              onChangeText={setAccountName}
            />

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: isDarkMode ? '#243330' : '#F4FAF8' }]}
              placeholder="Initial Balance"
              placeholderTextColor="#8E9E9A"
              keyboardType="numeric"
              value={accountBalance}
              onChangeText={setAccountBalance}
            />

            {/* Type selector */}
            <Text style={styles.typeLabel}>Account Icon</Text>
            <View style={styles.typeSelectorRow}>
              {(['cash', 'card', 'piggybank', 'visa'] as const).map(type => {
                const iconConfig = ACCOUNT_ICONS[type];
                const isSelected = accountType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      { borderColor: colors.border, backgroundColor: isDarkMode ? '#243330' : '#F4FAF8' },
                      isSelected && styles.typeOptionSelected,
                      isSelected && { borderColor: iconConfig.color, backgroundColor: isDarkMode ? `${iconConfig.color}15` : iconConfig.bgColor }
                    ]}
                    onPress={() => setAccountType(type)}
                  >
                    <MaterialCommunityIcons
                      name={iconConfig.icon as any}
                      size={20}
                      color={isSelected ? iconConfig.color : '#8E9E9A'}
                      style={{ marginBottom: 4 }}
                    />
                    <Text
                      style={[
                        styles.typeOptionText,
                        isSelected && { color: iconConfig.color, fontWeight: '700' },
                      ]}
                    >
                      {type === 'piggybank' ? 'PIGGY' : type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { backgroundColor: isDarkMode ? '#243330' : '#ECEFF1' }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalBtnCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave, { backgroundColor: colors.primary }]}
                onPress={handleSaveAccount}
              >
                <Text style={styles.modalBtnSaveText}>
                  {editingAccount ? 'Save' : 'Add'}
                </Text>
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
  centerContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
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
  optionsContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C2A27',
    textAlign: 'center',
    marginBottom: 4,
  },
  optionsSubtitle: {
    fontSize: 12,
    color: '#8E9E9A',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4FAF8',
  },
  deleteOptionBtn: {
    borderBottomWidth: 0,
    marginBottom: 16,
  },
  optionsBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C2A27',
  },
  optionsCancelBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECEFF1',
  },
  optionsCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7B77',
  },
});
