import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { PortalColors, Spacing } from '@/constants/portal';

type Props = {
  title: string;
  style?: ViewStyle;
};

export function SectionHeader({ title, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  title: {
    color: PortalColors.navySoft,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: PortalColors.border,
  },
});

