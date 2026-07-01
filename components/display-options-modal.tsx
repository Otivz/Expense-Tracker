import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/theme-context';

const { width } = Dimensions.get('window');

export type ViewMode = 'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly';
export type ShowTotal = 'yes' | 'no';
export type CarryOver = 'on' | 'off';

interface DisplayOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  showTotal: ShowTotal;
  setShowTotal: (val: ShowTotal) => void;
  carryOver: CarryOver;
  setCarryOver: (val: CarryOver) => void;
}

export function DisplayOptionsModal({
  visible,
  onClose,
  viewMode,
  setViewMode,
  showTotal,
  setShowTotal,
  carryOver,
  setCarryOver,
}: DisplayOptionsModalProps) {
  const { colors, isDarkMode } = useTheme();

  const handleSave = () => {
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableWithoutFeedback>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            {/* Close Button */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Modal Title */}
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFFFFF' : colors.primary }]}>
              Display options
            </Text>

            {/* Option: View Mode */}
            <View style={styles.optionSection}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>View mode:</Text>
              <View style={styles.choicesList}>
                {([
                  { id: 'daily', label: 'DAILY' },
                  { id: 'weekly', label: 'WEEKLY' },
                  { id: 'monthly', label: 'MONTHLY' },
                  { id: '3months', label: '3 MONTHS' },
                  { id: '6months', label: '6 MONTHS' },
                  { id: 'yearly', label: 'YEARLY' },
                ] as const).map((choice) => {
                  const isSelected = viewMode === choice.id;
                  return (
                    <TouchableOpacity
                      key={choice.id}
                      style={styles.choiceRow}
                      onPress={() => setViewMode(choice.id)}
                    >
                      {isSelected ? (
                        <Ionicons name="checkmark" size={16} color={colors.primary} style={styles.checkIcon} />
                      ) : (
                        <View style={styles.checkSpacer} />
                      )}
                      <Text
                        style={[
                          styles.choiceText,
                          { color: isSelected ? colors.primary : colors.textSecondary },
                          isSelected && styles.selectedChoiceText,
                        ]}
                      >
                        {choice.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Option: Show Total */}
            <View style={styles.optionSection}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Show total:</Text>
              <View style={styles.choicesList}>
                {([
                  { id: 'yes', label: 'YES' },
                  { id: 'no', label: 'NO' },
                ] as const).map((choice) => {
                  const isSelected = showTotal === choice.id;
                  return (
                    <TouchableOpacity
                      key={choice.id}
                      style={styles.choiceRow}
                      onPress={() => setShowTotal(choice.id)}
                    >
                      {isSelected ? (
                        <Ionicons name="checkmark" size={16} color={colors.primary} style={styles.checkIcon} />
                      ) : (
                        <View style={styles.checkSpacer} />
                      )}
                      <Text
                        style={[
                          styles.choiceText,
                          { color: isSelected ? colors.primary : colors.textSecondary },
                          isSelected && styles.selectedChoiceText,
                        ]}
                      >
                        {choice.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Option: Carry Over */}
            <View style={styles.optionSection}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Carry over:</Text>
              <View style={styles.choicesList}>
                {([
                  { id: 'on', label: 'ON' },
                  { id: 'off', label: 'OFF' },
                ] as const).map((choice) => {
                  const isSelected = carryOver === choice.id;
                  return (
                    <TouchableOpacity
                      key={choice.id}
                      style={styles.choiceRow}
                      onPress={() => setCarryOver(choice.id)}
                    >
                      {isSelected ? (
                        <Ionicons name="checkmark" size={16} color={colors.primary} style={styles.checkIcon} />
                      ) : (
                        <View style={styles.checkSpacer} />
                      )}
                      <Text
                        style={[
                          styles.choiceText,
                          { color: isSelected ? colors.primary : colors.textSecondary },
                          isSelected && styles.selectedChoiceText,
                        ]}
                      >
                        {choice.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Helper Info Footer */}
            <View style={styles.infoFooter}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={colors.textSecondary}
                style={styles.infoIcon}
              />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                With Carry over enabled, monthly surplus will be added to the next month.
              </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: width * 0.85,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    right: 18,
    top: 18,
    zIndex: 10,
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  optionSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sectionLabel: {
    width: 100,
    fontSize: 15,
    fontWeight: '700',
    paddingTop: 2,
  },
  choicesList: {
    flex: 1,
    gap: 12,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    marginRight: 6,
    width: 16,
  },
  checkSpacer: {
    width: 22,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  selectedChoiceText: {
    fontWeight: '700',
  },
  starIcon: {
    marginLeft: 6,
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  doneButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
