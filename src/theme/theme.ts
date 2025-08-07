import { DefaultTheme } from 'react-native-paper';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
};

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#16095b',
    secondary: '#2d1b69',
    accent: '#06b6d4',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    onSurface: '#475569',
    textSecondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    shadow: '#000000',
    outline: '#e2e8f0',
    onSurfaceVariant: '#64748b',
  },
};

export const darkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3d2a7a',
    secondary: '#4a3485',
    accent: '#22d3ee',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    onSurface: '#e2e8f0',
    textSecondary: '#cbd5e1',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    shadow: '#000000',
    outline: '#334155',
    onSurfaceVariant: '#cbd5e1',
  },
};

export const getTheme = (isDarkMode: boolean) => isDarkMode ? darkTheme : lightTheme;