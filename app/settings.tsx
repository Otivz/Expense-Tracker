import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSidebar } from '@/context/sidebar-context';
import { useTheme } from '@/context/theme-context';

export default function SettingsScreen() {
  const router = useRouter();

  const { isDarkMode, colors, toggleTheme } = useTheme();
  const [passcodeEnabled, setPasscodeEnabled] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);

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
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Daily log notifications</Text>
                </View>
              </View>
              <Switch
                value={dailyReminder}
                onValueChange={setDailyReminder}
                trackColor={{ false: colors.divider, true: '#A0D3C7' }}
                thumbColor={dailyReminder ? colors.primary : '#CFD8DC'}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <TouchableOpacity style={styles.row} onPress={() => Alert.alert('Notification Settings', 'Configure native alert timings.')}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="notifications" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Notification Settings</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Alert sounds and badge configs</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#B0BEC5" />
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
});
