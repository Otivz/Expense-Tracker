import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '@/hooks/useTransactions';
import { Header } from '@/components/header';
import { useTheme } from '@/context/theme-context';

export default function SearchScreen() {
  const { transactions } = useTransactions();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Clean the query and filter transactions
  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredTransactions = cleanQuery
    ? transactions.filter((tx) => {
        const matchesDescription = tx.description
          ? tx.description.toLowerCase().includes(cleanQuery)
          : false;
        const matchesCategory = tx.category.toLowerCase().includes(cleanQuery);
        const matchesAccount = tx.accountName
          ? tx.accountName.toLowerCase().includes(cleanQuery)
          : false;

        return matchesDescription || matchesCategory || matchesAccount;
      })
    : [];

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food':
        return 'fast-food';
      case 'rent':
        return 'home';
      case 'transport':
        return 'bus';
      case 'leisure':
        return 'game-controller';
      case 'salary':
        return 'briefcase';
      case 'freelance':
        return 'laptop-outline';
      case 'investments':
        return 'trending-up';
      default:
        return 'receipt-outline';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food':
        return '#FF6B6B';
      case 'rent':
        return '#4D96FF';
      case 'transport':
        return '#6BCB77';
      case 'leisure':
        return '#FFA216';
      case 'salary':
        return '#0D8A63';
      case 'freelance':
        return '#9B51E0';
      case 'investments':
        return '#2D9CDB';
      default:
        return '#6B7B77';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#014134" />
      <Header title="C-Vault" />

      <View style={styles.content}>
        {/* Search Bar Container */}
        <View style={[styles.searchBarContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons
            name="search"
            size={20}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Search by notes, category, account..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results Info Bar */}
        {cleanQuery.length > 0 && (
          <View style={styles.resultsInfo}>
            <Text style={[styles.resultsInfoText, { color: colors.textSecondary }]}>
              Found {filteredTransactions.length}{' '}
              {filteredTransactions.length === 1 ? 'record' : 'records'}
            </Text>
          </View>
        )}

        {/* Search Results List */}
        {cleanQuery.length === 0 ? (
          <View style={styles.stateContainer}>
            <View style={[styles.illustrationCircle, { backgroundColor: colors.card }]}>
              <Ionicons name="search-outline" size={44} color={colors.border} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.text }]}>Type to Search</Text>
            <Text style={[styles.stateSubtitle, { color: colors.textSecondary }]}>
              Search for transactions by entering words from notes, categories,
              or account names.
            </Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.stateContainer}>
            <View style={[styles.illustrationCircle, { backgroundColor: colors.card }]}>
              <Ionicons name="receipt-outline" size={44} color={colors.border} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.text }]}>No Records Found</Text>
            <Text style={[styles.stateSubtitle, { color: colors.textSecondary }]}>
              We couldn't find any transaction matching "{searchQuery}".
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.resultsList}
          >
            {filteredTransactions.map((tx) => (
              <View key={tx.id} style={[styles.txRow, { backgroundColor: colors.card }]}>
                {/* Left section: Icon */}
                <View
                  style={[
                    styles.txIconContainer,
                    { backgroundColor: `${getCategoryColor(tx.category)}15` },
                  ]}
                >
                  <Ionicons
                    name={getCategoryIcon(tx.category) as any}
                    size={20}
                    color={getCategoryColor(tx.category)}
                  />
                </View>

                {/* Middle section: Details */}
                <View style={styles.txDetails}>
                  <View style={styles.categoryAccountRow}>
                    <Text style={[styles.txCategory, { color: colors.text }]}>{tx.category}</Text>
                    {tx.accountName && (
                      <View style={[styles.accountBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.accountBadgeText, { color: colors.primary }]}>
                          {tx.accountName}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.txDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {tx.description || tx.category}
                  </Text>
                </View>

                {/* Right section: Amount & Date */}
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      tx.type === 'income'
                        ? styles.incomeAmount
                        : styles.expenseAmount,
                    ]}
                  >
                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.textSecondary }]}>{tx.date}</Text>
                </View>
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAF8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E5E0',
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1C2A27',
    height: '100%',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  resultsInfo: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  resultsInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7B77',
  },
  resultsList: {
    flex: 1,
    marginTop: 8,
  },
  stateContainer: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  illustrationCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C2A27',
    marginBottom: 8,
  },
  stateSubtitle: {
    fontSize: 13,
    color: '#6B7B77',
    textAlign: 'center',
    lineHeight: 18,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  txIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C2A27',
  },
  accountBadge: {
    backgroundColor: '#EAF4F1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  accountBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00684F',
    textTransform: 'uppercase',
  },
  txDesc: {
    fontSize: 12,
    color: '#6B7B77',
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  incomeAmount: {
    color: '#0D8A63',
  },
  expenseAmount: {
    color: '#FF6B6B',
  },
  txDate: {
    fontSize: 10,
    color: '#8E9E9A',
    marginTop: 2,
  },
});
