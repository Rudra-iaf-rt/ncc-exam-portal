import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { PortalColors, Spacing } from '@/constants/portal';

type Props = {
  badge?: string;
  title: string;
  subtitle?: string;
  tone?: 'default' | 'light';
  style?: ViewStyle;
};

export function PageHeader({ badge, title, subtitle, tone = 'default', style }: Props) {
  const light = tone === 'light';
  return (
    <View style={[styles.wrap, style]}>
      {badge ? <Text style={[styles.badge, light && styles.badgeLight]}>{badge}</Text> : null}
      <Text style={[styles.title, light && styles.titleLight]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, light && styles.subtitleLight]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.lg,
  },
  badge: {
    color: PortalColors.navySoft,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  title: {
    color: PortalColors.navy,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: PortalColors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  badgeLight: {
    color: PortalColors.accentMuted,
  },
  titleLight: {
    color: '#FFFFFF',
  },
  subtitleLight: {
    color: '#cbd5e1',
  },
});

