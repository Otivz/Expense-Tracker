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

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Bills', icon: 'document-text', color: '#4D96FF', type: 'expense' },
  { id: '2', name: 'Baby', icon: 'heart', color: '#FF8B94', type: 'expense' },
  { id: '3', name: 'Beauty', icon: 'rose', color: '#FF6B6B', type: 'expense' },
  { id: '4', name: 'Car', icon: 'car', color: '#9B51E0', type: 'expense' },
  { id: '5', name: 'Clothing', icon: 'shirt', color: '#FFA216', type: 'expense' },
  { id: '6', name: 'Food', icon: 'fast-food', color: '#FF6B6B', type: 'expense' },
  { id: '7', name: 'Rent', icon: 'home', color: '#4D96FF', type: 'expense' },
  { id: '8', name: 'Transport', icon: 'bus', color: '#6BCB77', type: 'expense' },
  { id: '9', name: 'Leisure', icon: 'game-controller', color: '#FFA216', type: 'expense' },
  { id: '10', name: 'Salary', icon: 'briefcase', color: '#0D8A63', type: 'income' },
  { id: '11', name: 'Freelance', icon: 'laptop', color: '#9B51E0', type: 'income' },
  { id: '12', name: 'Investments', icon: 'trending-up', color: '#2D9CDB', type: 'income' },
];

const AVAILABLE_ICONS = [
  'fast-food', 'home', 'bus', 'game-controller', 'briefcase', 'laptop', 'trending-up',
  'document-text', 'heart', 'rose', 'car', 'shirt', 'basket', 'gift', 'medical', 'school'
];

const AVAILABLE_COLORS = [
  '#00684F', '#0D8A63', '#FFA216', '#FF6B6B', '#4D96FF', '#9B51E0', '#6BCB77', '#FF8B94', '#2D9CDB'
];

export default function CategoriesScreen() {
  const { currentMonthIndex, transactions } = useTransactions();
  const { colors } = useTheme();
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('basket');
  const [selectedColor, setSelectedColor] = useState('#00684F');
  const [addModalVisible, setAddModalVisible] = useState(false);

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const monthString = (currentMonthIndex + 1).toString().padStart(2, '0');
  const monthPrefix = `2026-${monthString}`;
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(monthPrefix));

  const totalExpense = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const allTimeExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const allTimeIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = 14055.00 + allTimeIncome - allTimeExpense; // Use base reference balance of 14,055.00 from screenshot

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddCategory = () => {
    if (!categoryName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a category name.');
      return;
    }

    if (editingCategoryId) {
      setCategories(prev => prev.map(c => c.id === editingCategoryId ? {
        ...c,
        name: categoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
      } : c));
      setEditingCategoryId(null);
    } else {
      const newCategory: Category = {
        id: Math.random().toString(36).substring(2, 9),
        name: categoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
        type: activeTab,
      };
      setCategories(prev => [...prev, newCategory]);
    }

    setModalVisible(false);
    setCategoryName('');
    setSelectedIcon('basket');
    setSelectedColor('#00684F');
  };

  const handleDeleteCategory = (id: string, name: string) => {
    Alert.alert(
      'Remove Category',
      `Are you sure you want to remove the category "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setCategories(prev => prev.filter(c => c.id !== id));
          },
        },
      ]
    );
  };

  const handleCategoryOptions = (id: string, name: string, icon: string, color: string, type: 'expense' | 'income') => {
    Alert.alert(
      'Category Options',
      `What would you like to do with "${name}"?`,
      [
        {
          text: 'Edit',
          onPress: () => {
            setEditingCategoryId(id);
            setCategoryName(name);
            setSelectedIcon(icon);
            setSelectedColor(color);
            setActiveTab(type);
            setModalVisible(true);
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteCategory(id, name)
        },
        {
          text: 'Ignore',
          onPress: () => {
            Alert.alert('Ignored', `Category "${name}" ignored successfully.`);
          }
        }
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#014134" />
      <Header title="C-Vault" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Summary Block */}
        <AccountsSummary />

        {/* Income categories */}
        <View style={[styles.sectionHeaderContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>Income categories</Text>
        </View>

        <View style={[styles.categoryListCard, { backgroundColor: colors.card }]}>
          {incomeCategories.map(cat => (
            <View key={cat.id} style={[styles.categoryRow, { borderBottomColor: colors.divider }]}>
              <View style={styles.categoryRowLeft}>
                <View style={[styles.iconCircleCircle, { backgroundColor: `${cat.color}15` }]}>
                  <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                </View>
                <Text style={[styles.categoryNameText, { color: colors.text }]}>{cat.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleCategoryOptions(cat.id, cat.name, cat.icon, cat.color, cat.type)}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#8E9E9A" />
              </TouchableOpacity>
            </View>
          ))}

          <Button
            title="ADD NEW CATEGORY"
            icon="add"
            onPress={() => {
              setActiveTab('income');
              setModalVisible(true);
            }}
            style={styles.addButtonMargin}
          />
        </View>

        {/* Expense categories */}
        <View style={[styles.sectionHeaderContainer, { marginTop: 24, borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>Expense categories</Text>
        </View>

        <View style={[styles.categoryListCard, { backgroundColor: colors.card }]}>
          {expenseCategories.map(cat => (
            <View key={cat.id} style={[styles.categoryRow, { borderBottomColor: colors.divider }]}>
              <View style={styles.categoryRowLeft}>
                <View style={[styles.iconCircleCircle, { backgroundColor: `${cat.color}15` }]}>
                  <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                </View>
                <Text style={[styles.categoryNameText, { color: colors.text }]}>{cat.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleCategoryOptions(cat.id, cat.name, cat.icon, cat.color, cat.type)}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#8E9E9A" />
              </TouchableOpacity>
            </View>
          ))}

          <Button
            title="ADD NEW CATEGORY"
            icon="add"
            onPress={() => {
              setActiveTab('expense');
              setModalVisible(true);
            }}
            style={styles.addButtonMargin}
          />
        </View>
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

      {/* Add Category Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingCategoryId ? 'Edit Category' : 'Add Category'}</Text>

            <TextInput
              style={styles.input}
              placeholder="Category Name"
              placeholderTextColor="#8E9E9A"
              value={categoryName}
              onChangeText={setCategoryName}
            />

            {/* Icon Picker */}
            <Text style={styles.sectionLabel}>Select Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
              <View style={styles.pickerRow}>
                {AVAILABLE_ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.pickerIconBtn, selectedIcon === icon && styles.pickerIconBtnSelected]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Ionicons name={icon as any} size={20} color={selectedIcon === icon ? '#00684F' : '#6B7B77'} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Color Picker */}
            <Text style={styles.sectionLabel}>Select Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
              <View style={styles.pickerRow}>
                {AVAILABLE_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorBtn, { backgroundColor: color }, selectedColor === color && styles.colorBtnSelected]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setModalVisible(false);
                  setEditingCategoryId(null);
                  setCategoryName('');
                  setSelectedIcon('basket');
                  setSelectedColor('#00684F');
                }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleAddCategory}
              >
                <Text style={styles.modalBtnSaveText}>{editingCategoryId ? 'Save' : 'Add'}</Text>
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
    padding: 16,
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
  categoryListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4FAF8',
  },
  categoryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircleCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C2A27',
  },
  actionBtn: {
    padding: 6,
  },
  addButtonMargin: {
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00684F',
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
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7B77',
    marginBottom: 8,
  },
  pickerScroll: {
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7E5E0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4FAF8',
  },
  pickerIconBtnSelected: {
    borderColor: '#00684F',
    backgroundColor: '#EAF4F1',
  },
  colorBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  colorBtnSelected: {
    borderWidth: 2,
    borderColor: '#1C2A27',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
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
});
