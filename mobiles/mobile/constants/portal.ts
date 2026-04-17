import { Platform } from 'react-native';

/** Brand palette — disciplined, institutional */
export const PortalColors = {
  navy: '#0f2744',
  navyLight: '#1a3a5c',
  slate: '#334155',
  muted: '#64748b',
  border: '#e2e8f0',
  borderDark: '#334155',
  accent: '#2563eb',
  accentMuted: '#dbeafe',
  gold: '#b8860b',
  success: '#059669',
  danger: '#dc2626',
  cardLight: '#ffffff',
  cardDark: '#1e293b',
  overlay: 'rgba(15, 39, 68, 0.92)',
};

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};

export function getShadow(elevation: number) {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: 0.08 + elevation * 0.02,
      shadowRadius: elevation * 2,
    },
    android: { elevation: elevation * 2 },
    default: {},
  });
}
