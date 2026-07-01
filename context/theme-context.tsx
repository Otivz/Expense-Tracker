import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  divider: string;
  primary: string;
  primaryLight: string;
  statusBar: 'light-content' | 'dark-content';
}

const lightColors: ThemeColors = {
  background: '#F4FAF8',
  card: '#FFFFFF',
  text: '#1C2A27',
  textSecondary: '#6B7B77',
  border: '#D7E5E0',
  divider: '#ECEFF1',
  primary: '#00684F',
  primaryLight: '#EAF4F1',
  statusBar: 'light-content',
};

const darkColors: ThemeColors = {
  background: '#121B1A',
  card: '#1A2624',
  text: '#E0E6E4',
  textSecondary: '#8E9E9A',
  border: '#2D3D3A',
  divider: '#243330',
  primary: '#0D8A63',
  primaryLight: '#1D332E',
  statusBar: 'light-content', // C-Vault maintains emerald status bar
};

interface ThemeContextType {
  isDarkMode: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceColorScheme = useDeviceColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(deviceColorScheme === 'dark');

  // Sync with device settings initially
  useEffect(() => {
    setIsDarkMode(deviceColorScheme === 'dark');
  }, [deviceColorScheme]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
