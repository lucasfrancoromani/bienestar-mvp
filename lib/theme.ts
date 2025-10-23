// app/theme.ts
import { Platform } from 'react-native';

export const colors = {
  // Paleta soft wellness
  bg: '#FAFAFA',
  bg2: '#fbf6ffff',
  bgCard: '#FFFFFF',
  text: '#0F172A',          // slate-900
  textMuted: '#64748B',     // slate-500
  primary: '#0EA5E9',       // sky-500
  primaryDark: '#0284C7',   // sky-600
  successBg: '#DCFCE7',
  successFg: '#166534',
  warnBg: '#FEF9C3',
  warnFg: '#92400E',
  dangerBg: '#FEE2E2',
  dangerFg: '#991B1B',
  border: '#E5E7EB',
  tabBar: '#FFFFFF',
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 30,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
};

export const shadow = Platform.select({
  ios: {
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
    },
  },
  android: {
    card: { elevation: 2 },
  },
});

export const typography = {
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text },
  p: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
};
