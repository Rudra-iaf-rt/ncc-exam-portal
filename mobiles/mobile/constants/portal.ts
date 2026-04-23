import { Platform } from 'react-native';

/** Brand palette — disciplined, institutional */
export const PortalColors = {
  navy: '#0B162B',
  navyMid: '#1A2B4A',
  navySoft: '#2C446E',
  slate: '#374151',
  muted: '#6B7280',
  border: '#D6CEC2',
  borderDark: '#334155',
  accent: '#2C446E',
  accentMuted: '#E8EDF5',
  gold: '#C9982A',
  success: '#3B6D11',
  danger: '#8B1A1A',
  cardLight: '#FFFEFA',
  cardDark: '#1e293b',
  stone: '#F4F2EC',
  parchment: '#FAF8F2',
  overlay: 'rgba(11, 22, 43, 0.92)',
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
  md: 10,
  lg: 14,
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
