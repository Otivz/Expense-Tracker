import { categoryRepository } from '@/db/repositories/categoryRepository';
import { useVault } from '@/context/vault-context';
import { sendLocalNotification } from '@/utils/notifications';
import { type Category } from '@/db/models/category';
import { AccountsSummary } from '@/components/accounts-summary';
import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { useTheme } from '@/context/theme-context';
import { useTransactions } from '@/hooks/useTransactions';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
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

// Category model is loaded directly from the database schema.


const AVAILABLE_ICONS = [
  'fast-food', 'home', 'bus', 'game-controller', 'briefcase', 'laptop', 'trending-up',
  'document-text', 'heart', 'rose', 'car', 'shirt', 'basket', 'gift', 'medical', 'school',
  'cart', 'construct', 'airplane', 'subway', 'water', 'flame', 'tv', 'beer',
  'dumbbell', 'scissors', 'book', 'wallet', 'cash', 'card', 'shield-checkmark', 'hammer'
];

const AVAILABLE_COLORS = [
  '#00684F', '#0D8A63', '#FFA216', '#FF6B6B', '#4D96FF', '#9B51E0', '#6BCB77', '#FF8B94', '#2D9CDB'
];

export default function CategoriesScreen() {
  const { currentMonthIndex, transactions } = useTransactions();
  const { colors, isDarkMode } = useTheme();
  const { currentAccount } = useVault();
  const userId = currentAccount?.id || 'mock-user-id';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('Untitled');
  const [selectedIcon, setSelectedIcon] = useState('basket');
  const [selectedColor, setSelectedColor] = useState('#00684F');
  const [addModalVisible, setAddModalVisible] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const dbCats = await categoryRepository.getAll(userId);
      setCategories(dbCats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories])
  );

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const openAddCategoryModal = (type: 'expense' | 'income') => {
    setEditingCategoryId(null);
    setCategoryName('Untitled');
    setSelectedIcon('basket');
    setSelectedColor('#00684F');
    setActiveTab(type);
    setModalVisible(true);
  };

  const handleAddCategory = async () => {
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      Alert.alert('Invalid Name', 'Please enter a category name.');
      return;
    }

    try {
      if (editingCategoryId) {
        await categoryRepository.update({
          id: editingCategoryId,
          user_id: userId,
          name: trimmedName,
          icon: selectedIcon,
          color: selectedColor,
          type: activeTab,
        });
      } else {
        await categoryRepository.insert({
          id: 'cat-usr-' + Math.random().toString(36).substring(2, 9),
          user_id: userId,
          name: trimmedName,
          icon: selectedIcon,
          color: selectedColor,
          type: activeTab,
        });
      }
      setModalVisible(false);
      setEditingCategoryId(null);
      setCategoryName('Untitled');
      setSelectedIcon('basket');
      setSelectedColor('#00684F');
      await loadCategories();

      const message = editingCategoryId
        ? `Category "${trimmedName}" was successfully updated.`
        : `Category "${trimmedName}" was successfully created.`;
      await sendLocalNotification('Category Saved 🏷️', message);
    } catch (err) {
      console.error('Failed to save category:', err);
      Alert.alert('Error', 'An error occurred while saving the category. Make sure the name is unique.');
    }
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
          onPress: async () => {
            try {
              await categoryRepository.delete(id);
              await loadCategories();
              await sendLocalNotification('Category Removed 🗑️', `Category "${name}" was successfully removed.`);
            } catch (err) {
              console.error('Failed to delete category:', err);
              Alert.alert('Error', 'Failed to remove category.');
            }
          },
        },
      ]
    );
  };

  const handleCategoryOptions = (id: string, name: string, icon: string, color: string, type: 'expense' | 'income') => {
    const options = [
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
        style: 'destructive' as const,
        onPress: () => handleDeleteCategory(id, name)
      },
      {
        text: 'Cancel',
        style: 'cancel' as const
      }
    ];

    Alert.alert(
      'Category Options',
      `What would you like to do with "${name}"?`,
      options,
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
                <View style={[styles.iconCircleCircle, { backgroundColor: `${cat.color || '#00684F'}15` }]}>
                  <Ionicons name={(cat.icon || 'basket') as any} size={20} color={cat.color || '#00684F'} />
                </View>
                <Text style={[styles.categoryNameText, { color: colors.text }]}>{cat.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleCategoryOptions(cat.id, cat.name, cat.icon || 'basket', cat.color || '#00684F', cat.type)}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#8E9E9A" />
              </TouchableOpacity>
            </View>
          ))}

          <Button
            title="ADD NEW CATEGORY"
            icon="add"
            onPress={() => openAddCategoryModal('income')}
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
                <View style={[styles.iconCircleCircle, { backgroundColor: `${cat.color || '#00684F'}15` }]}>
                  <Ionicons name={(cat.icon || 'basket') as any} size={20} color={cat.color || '#00684F'} />
                </View>
                <Text style={[styles.categoryNameText, { color: colors.text }]}>{cat.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleCategoryOptions(cat.id, cat.name, cat.icon || 'basket', cat.color || '#00684F', cat.type)}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#8E9E9A" />
              </TouchableOpacity>
            </View>
          ))}

          <Button
            title="ADD NEW CATEGORY"
            icon="add"
            onPress={() => openAddCategoryModal('expense')}
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingCategoryId ? 'Edit Category' : 'Add Category'}</Text>

            {/* Type Switcher */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Type</Text>
            <View style={[styles.typeToggleContainer, { borderColor: colors.border, backgroundColor: isDarkMode ? '#1e2d2a' : '#F4FAF8' }]}>
              <TouchableOpacity
                style={[
                  styles.typeToggleBtn,
                  activeTab === 'expense' && [styles.typeToggleBtnActive, { backgroundColor: '#FF6B6B' }]
                ]}
                onPress={() => setActiveTab('expense')}
              >
                <Text style={[
                  styles.typeToggleText,
                  activeTab === 'expense' ? styles.typeToggleTextActive : { color: colors.text }
                ]}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeToggleBtn,
                  activeTab === 'income' && [styles.typeToggleBtnActive, { backgroundColor: '#0D8A63' }]
                ]}
                onPress={() => setActiveTab('income')}
              >
                <Text style={[
                  styles.typeToggleText,
                  activeTab === 'income' ? styles.typeToggleTextActive : { color: colors.text }
                ]}>Income</Text>
              </TouchableOpacity>
            </View>

            {/* Category Name Input */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: isDarkMode ? '#1e2d2a' : '#F4FAF8' }]}
              placeholder="Category Name"
              placeholderTextColor="#8E9E9A"
              value={categoryName}
              onChangeText={setCategoryName}
            />

            {/* Icon Picker */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Select Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
              <View style={styles.pickerRow}>
                {AVAILABLE_ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.pickerIconBtn, { borderColor: colors.border, backgroundColor: isDarkMode ? '#1e2d2a' : '#F4FAF8' }, selectedIcon === icon && [styles.pickerIconBtnSelected, { borderColor: colors.primary, backgroundColor: isDarkMode ? '#244d3e' : '#EAF4F1' }]]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Ionicons name={icon as any} size={20} color={selectedIcon === icon ? (isDarkMode ? '#03DAC6' : '#00684F') : '#6B7B77'} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Color Picker */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Select Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
              <View style={styles.pickerRow}>
                {AVAILABLE_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorBtn, { backgroundColor: color }, selectedColor === color && [styles.colorBtnSelected, { borderColor: colors.text }]]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { backgroundColor: colors.border }]}
                onPress={() => {
                  setModalVisible(false);
                  setEditingCategoryId(null);
                  setCategoryName('Untitled');
                  setSelectedIcon('basket');
                  setSelectedColor('#00684F');
                }}
              >
                <Text style={[styles.modalBtnCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave, { backgroundColor: colors.primary }]}
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
  typeToggleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D7E5E0',
    borderRadius: 8,
    backgroundColor: '#F4FAF8',
    marginBottom: 16,
    overflow: 'hidden',
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeToggleBtnActive: {
    backgroundColor: '#00684F',
  },
  typeToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeToggleTextActive: {
    color: '#FFFFFF',
  },
});
