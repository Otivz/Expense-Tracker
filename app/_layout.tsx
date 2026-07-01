import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SidebarProvider } from '@/context/sidebar-context';
import { Sidebar } from '@/components/sidebar';
import { ThemeProvider } from '@/context/theme-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider>
      <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SidebarProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
          </Stack>
          <Sidebar />
          <StatusBar style="auto" />
        </SidebarProvider>
      </NavThemeProvider>
    </ThemeProvider>
  );
}
