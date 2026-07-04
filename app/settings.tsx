import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/theme-context';
import * as SecureStore from 'expo-secure-store';
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  requestNotificationPermissions,
} from '@/utils/notifications';

export default function SettingsScreen() {
  const router = useRouter();

  const { isDarkMode, colors, toggleTheme } = useTheme();
  const [passcodeEnabled, setPasscodeEnabled] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [reminderHour, setReminderHour] = useState(20); // default 8 PM
  const [reminderMinute, setReminderMinute] = useState(0);

  // Time picker temporary states
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [tempHour, setTempHour] = useState(8);
  const [tempMinute, setTempMinute] = useState(0);
  const [tempPeriod, setTempPeriod] = useState<'AM' | 'PM'>('PM');

  const REMINDER_ENABLED_KEY = 'cvault_reminder_enabled';
  const REMINDER_TIME_KEY = 'cvault_reminder_time';

  const getSetting = async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error(`Error reading setting ${key}:`, e);
      return null;
    }
  };

  const setSetting = async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error(`Error writing setting ${key}:`, e);
    }
  };

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const enabledVal = await getSetting(REMINDER_ENABLED_KEY);
      const timeVal = await getSetting(REMINDER_TIME_KEY);

      if (enabledVal !== null) {
        setDailyReminder(enabledVal === 'true');
      }
      if (timeVal !== null) {
        try {
          const { hour, minute } = JSON.parse(timeVal);
          setReminderHour(hour);
          setReminderMinute(minute);
        } catch (e) {
          console.error('Failed to parse reminder time', e);
        }
      }
    };
    loadSettings();
  }, []);

  const handleToggleReminder = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        setDailyReminder(true);
        await setSetting(REMINDER_ENABLED_KEY, 'true');
        await scheduleDailyReminder(reminderHour, reminderMinute);
        Alert.alert(
          'Reminder Enabled ⏰',
          `You will receive a daily reminder at ${formatTime(reminderHour, reminderMinute)}.`
        );
      } else {
        setDailyReminder(false);
        await setSetting(REMINDER_ENABLED_KEY, 'false');
        Alert.alert(
          'Permission Required',
          'To receive reminders, please enable notification permissions in your system settings.'
        );
      }
    } else {
      setDailyReminder(false);
      await setSetting(REMINDER_ENABLED_KEY, 'false');
      await cancelDailyReminder();
    }
  };

  const formatTime = (hour: number, minute: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${ampm}`;
  };

  const openTimePicker = () => {
    const period = reminderHour >= 12 ? 'PM' : 'AM';
    const displayHour = reminderHour % 12 === 0 ? 12 : reminderHour % 12;
    
    setTempHour(displayHour);
    setTempMinute(reminderMinute);
    setTempPeriod(period);
    setIsTimePickerVisible(true);
  };

  const saveTimePicker = async () => {
    let hour24 = tempHour % 12;
    if (tempPeriod === 'PM') {
      hour24 += 12;
    }

    setReminderHour(hour24);
    setReminderMinute(tempMinute);
    setIsTimePickerVisible(false);

    await setSetting(REMINDER_TIME_KEY, JSON.stringify({ hour: hour24, minute: tempMinute }));

    if (dailyReminder) {
      await scheduleDailyReminder(hour24, tempMinute);
      Alert.alert(
        'Reminder Updated ⏰',
        `Daily reminder time has been set to ${formatTime(hour24, tempMinute)}.`
      );
    } else {
      Alert.alert(
        'Time Saved',
        `Reminder time is set to ${formatTime(hour24, tempMinute)}. Turn on "Reminder Everyday" to activate it.`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Turn On Now',
            onPress: () => handleToggleReminder(true),
          },
        ]
      );
    }
  };

  const incrementTempHour = () => {
    setTempHour(prev => (prev === 12 ? 1 : prev + 1));
  };

  const decrementTempHour = () => {
    setTempHour(prev => (prev === 1 ? 12 : prev - 1));
  };

  const incrementTempMinute = () => {
    setTempMinute(prev => (prev === 59 ? 0 : prev + 1));
  };

  const decrementTempMinute = () => {
    setTempMinute(prev => (prev === 0 ? 59 : prev - 1));
  };

  const handleEmail = () => {
    Linking.openURL('mailto:emmanuelvitocruz@gmail.com').catch(() => {
      Alert.alert('Contact Developer', 'Please email Emmanuel at: emmanuelvitocruz@gmail.com');
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#014134" />

      {/* Settings Header with Back Button */}
      <LinearGradient
        colors={['#014134', '#00684F']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settings</Text>
            <View style={{ width: 32 }} /> {/* Spacing placeholder */}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Appearance Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>Appearance</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name={isDarkMode ? "moon" : "sunny"} size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>UI Mode</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    {isDarkMode ? 'Dark' : 'Light'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.divider, true: '#A0D3C7' }}
                thumbColor={isDarkMode ? colors.primary : '#CFD8DC'}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            
            <TouchableOpacity style={styles.row} onPress={() => Alert.alert('Currency Sign', 'Philippine Peso (Php) is set as default.')}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="cash" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Currency Sign</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Philippine Peso - Php</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#B0BEC5" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>Security</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="lock-closed" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Passcode Protection</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Secure your financial vault</Text>
                </View>
              </View>
              <Switch
                value={passcodeEnabled}
                onValueChange={setPasscodeEnabled}
                trackColor={{ false: colors.divider, true: '#A0D3C7' }}
                thumbColor={passcodeEnabled ? colors.primary : '#CFD8DC'}
              />
            </View>
          </View>
        </View>

        {/* Notification Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>Notification</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="alarm" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Reminder Everyday</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    {dailyReminder ? `Active at ${formatTime(reminderHour, reminderMinute)}` : 'Daily log notifications'}
                  </Text>
                </View>
              </View>
              <Switch
                value={dailyReminder}
                onValueChange={handleToggleReminder}
                trackColor={{ false: colors.divider, true: '#A0D3C7' }}
                thumbColor={dailyReminder ? colors.primary : '#CFD8DC'}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <TouchableOpacity style={styles.row} onPress={openTimePicker} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="time" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Reminder Time</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Set when you want to be reminded
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                  {formatTime(reminderHour, reminderMinute)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#B0BEC5" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Policies Section */}
        <View style={styles.sectionContainer}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.row} onPress={() => Alert.alert('Privacy Policy', 'Your financial data stays securely on your local device. We gather zero personal details.')}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Privacy Policy</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Read our data privacy commitment</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#B0BEC5" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Developer Info Footer */}
        <View style={styles.footer}>
          <View style={[styles.footerDivider, { backgroundColor: colors.divider }]} />
          
          <View style={styles.footerBranding}>
            <LinearGradient
              colors={[colors.primary, '#014134']}
              style={styles.logoBadge}
            >
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.footerAppName, { color: colors.primary }]}>C-Vault</Text>
          </View>
          
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Developed by Emmanuel Vito Cruz</Text>
          
          <TouchableOpacity onPress={handleEmail} style={[styles.emailButton, { backgroundColor: colors.primaryLight }]} activeOpacity={0.7}>
            <Ionicons name="mail" size={14} color={colors.primary} />
            <Text style={[styles.emailText, { color: colors.primary }]}>emmanuelvitocruz@gmail.com</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>v1.0.0 • Local Storage Mode</Text>
        </View>

      </ScrollView>

      {/* Custom Time Picker Modal */}
      <Modal
        visible={isTimePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsTimePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Reminder Time</Text>
            
            <View style={styles.pickerContainer}>
              {/* Hour Selector */}
              <View style={styles.pickerColumn}>
                <TouchableOpacity onPress={incrementTempHour} style={[styles.pickerArrowButton, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="chevron-up" size={24} color={colors.primary} />
                </TouchableOpacity>
                <View style={[styles.pickerValueBox, { backgroundColor: colors.background }]}>
                  <Text style={[styles.pickerValueText, { color: colors.text }]}>
                    {tempHour.toString().padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity onPress={decrementTempHour} style={[styles.pickerArrowButton, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="chevron-down" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.pickerLabelText, { color: colors.textSecondary }]}>Hour</Text>
              </View>

              <Text style={[styles.pickerSeparator, { color: colors.text }]}>:</Text>

              {/* Minute Selector */}
              <View style={styles.pickerColumn}>
                <TouchableOpacity onPress={incrementTempMinute} style={[styles.pickerArrowButton, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="chevron-up" size={24} color={colors.primary} />
                </TouchableOpacity>
                <View style={[styles.pickerValueBox, { backgroundColor: colors.background }]}>
                  <Text style={[styles.pickerValueText, { color: colors.text }]}>
                    {tempMinute.toString().padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity onPress={decrementTempMinute} style={[styles.pickerArrowButton, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="chevron-down" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.pickerLabelText, { color: colors.textSecondary }]}>Minute</Text>
              </View>

              {/* AM/PM Selector */}
              <View style={styles.periodColumn}>
                <TouchableOpacity
                  onPress={() => setTempPeriod('AM')}
                  style={[
                    styles.periodButton,
                    tempPeriod === 'AM' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                >
                  <Text style={[
                    styles.periodButtonText,
                    tempPeriod === 'AM' ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: colors.textSecondary }
                  ]}>
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTempPeriod('PM')}
                  style={[
                    styles.periodButton,
                    tempPeriod === 'PM' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                >
                  <Text style={[
                    styles.periodButtonText,
                    tempPeriod === 'PM' ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: colors.textSecondary }
                  ]}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setIsTimePickerVisible(false)}
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.divider }]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveTimePicker}
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
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
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 28,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  backButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'web' ? 'system-ui' : undefined,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00684F',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C2A27',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#6B7B77',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F4FAF8',
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 20,
  },
  footerDivider: {
    width: '60%',
    height: 1,
    backgroundColor: '#ECEFF1',
    marginBottom: 24,
  },
  footerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerAppName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00684F',
    letterSpacing: 0.3,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7B77',
    marginBottom: 6,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#EAF4F1',
    borderRadius: 20,
    marginBottom: 12,
  },
  emailText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00684F',
  },
  versionText: {
    fontSize: 11,
    color: '#B0BEC5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  pickerColumn: {
    alignItems: 'center',
    width: 60,
  },
  pickerArrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerValueBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  pickerValueText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  pickerLabelText: {
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerSeparator: {
    fontSize: 28,
    fontWeight: 'bold',
    marginHorizontal: 4,
    marginTop: -16,
  },
  periodColumn: {
    justifyContent: 'center',
    gap: 6,
    marginLeft: 8,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    alignItems: 'center',
    width: 56,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    elevation: 1,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
