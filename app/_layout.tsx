import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '@/utils/notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider } from 'expo-sqlite';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SidebarProvider } from '@/context/sidebar-context';
import { Sidebar } from '@/components/sidebar';
import { ThemeProvider } from '@/context/theme-context';
import { VaultProvider, useVault } from '@/context/vault-context';
import { VaultScreen } from '@/components/vault/vault-screen';
import { initializeDatabase } from '../db/schema';
import { DatabaseErrorBoundary, DatabaseSuccessTracker } from '@/components/database-error-boundary';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent({ colorScheme }: { colorScheme: 'light' | 'dark' }) {
  const { isUnlocked } = useVault();

  if (!isUnlocked) {
    return <VaultScreen />;
  }

  return (
    <SidebarProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
      <Sidebar />
      <StatusBar style="auto" />
    </SidebarProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseErrorBoundary>
        <SQLiteProvider databaseName="cvault.db" onInit={initializeDatabase}>
          <DatabaseSuccessTracker />
          <ThemeProvider>
            <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <VaultProvider>
                <AppContent colorScheme={colorScheme ?? 'light'} />
              </VaultProvider>
            </NavThemeProvider>
          </ThemeProvider>
        </SQLiteProvider>
      </DatabaseErrorBoundary>
    </GestureHandlerRootView>
  );
}

