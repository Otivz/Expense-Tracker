import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/theme-context';

type ButtonVariant = 'outline' | 'primary' | 'cancel';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'outline',
  icon,
  style,
  textStyle,
  disabled,
}: ButtonProps) {
  const { colors } = useTheme();

  const isPrimary = variant === 'primary';
  const isCancel = variant === 'cancel';
  const isOutline = variant === 'outline';

  const buttonStyles = [
    styles.button,
    isOutline && [styles.outlineButton, { borderColor: colors.primary }],
    isPrimary && [styles.primaryButton, { backgroundColor: colors.primary }],
    isCancel && [styles.cancelButton, { backgroundColor: colors.divider }],
    style,
  ];

  const textStyles = [
    styles.buttonText,
    isOutline && [styles.outlineText, { color: colors.primary }],
    isPrimary && styles.primaryText,
    isCancel && [styles.cancelText, { color: colors.textSecondary }],
    textStyle,
  ];

  const iconColor = isPrimary
    ? '#FFFFFF'
    : isCancel
    ? colors.textSecondary
    : colors.primary;

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={18}
          color={iconColor}
          style={styles.icon}
        />
      )}
      <Text style={textStyles}>{title.toUpperCase()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#00684F',
    backgroundColor: 'transparent',
  },
  primaryButton: {
    backgroundColor: '#00684F',
  },
  cancelButton: {
    backgroundColor: '#ECEFF1',
  },
  icon: {
    marginRight: 6,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  outlineText: {
    color: '#00684F',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  cancelText: {
    color: '#6B7B77',
  },
});
