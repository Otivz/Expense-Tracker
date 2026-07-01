import { useSidebar } from '@/context/sidebar-context';
import { useTheme } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(width * 0.78, 300);

export function Sidebar() {
  const { isOpen, closeSidebar } = useSidebar();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  // Animations
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      // Slide in and fade overlay in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out and fade overlay out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      closeSidebar();
    });
  };

  const handleSettingsPress = () => {
    handleClose();
    setTimeout(() => {
      router.push('/settings');
    }, 220);
  };

  const handleAction = (actionName: string) => {
    handleClose();
    setTimeout(() => {
      Alert.alert(actionName, `You clicked on "${actionName}". This feature is coming soon!`);
    }, 250);
  };

  const handleDeleteReset = () => {
    handleClose();
    setTimeout(() => {
      Alert.alert(
        'Delete & Reset',
        'Are you sure you want to delete all records and reset the application? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: () => {
              Alert.alert('Success', 'Application data has been reset.');
            },
          },
        ]
      );
    }, 250);
  };

  const handleLogout = () => {
    handleClose();
    setTimeout(() => {
      Alert.alert(
        'Logout',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: () => {
              Alert.alert('Logged Out', 'You have been successfully logged out.');
            },
          },
        ]
      );
    }, 250);
  };

  return (
    <Modal
      transparent
      visible={isOpen}
      onRequestClose={handleClose}
      animationType="none"
    >
      <View style={styles.overlayContainer}>
        {/* Dimmed Overlay */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Sidebar Slide-out Panel */}
        <Animated.View
          style={[
            styles.sidebarContainer,
            {
              backgroundColor: colors.card,
              transform: [{ translateX: slideAnim }],
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* C-Vault Header */}
          <View style={styles.vaultHeader}>
            <Image
              source={require('@/assets/images/header-logo.png')}
              style={[styles.vaultLogoImage, { tintColor: isDarkMode ? '#FFFFFF' : colors.primary }]}
              resizeMode="contain"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Settings Section */}
          <TouchableOpacity
            style={styles.menuItemSingle}
            onPress={handleSettingsPress}
          >
            <Ionicons name="settings-outline" size={20} color={colors.text} />
            <Text style={[styles.menuItemSingleText, { color: colors.text }]}>Settings</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Management Section */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Management</Text>
          </View>

          {/* Management Actions */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleAction('Export Records')}
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Export Records</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleAction('Backup & Restore')}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={colors.text} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Backup & Restore</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleDeleteReset}
          >
            <Ionicons name="trash-outline" size={20} color="#D9383A" />
            <Text style={[styles.menuItemText, styles.dangerText]}>Delete & Reset</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Logout button */}
          <TouchableOpacity style={[styles.logoutButton, { borderTopColor: colors.divider }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#D9383A" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sidebarContainer: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 16,
    paddingHorizontal: 20,
  },
  vaultHeader: {
    height: 56,
    justifyContent: 'center',
    marginTop: 10,
  },
  vaultLogoImage: {
    width: 60,
    height: 40,
    transform: [{ scale: 1.90 }],
    marginLeft: 35,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECEFF1',
    marginVertical: 14,
  },
  menuItemSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  menuItemSingleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C2A27',
  },
  sectionHeaderContainer: {
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7B77',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C2A27',
  },
  dangerText: {
    color: '#D9383A',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    marginTop: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D9383A',
  },
});
