import { StyleSheet, View, type ViewProps } from 'react-native';

import { PortalColors, Radius, Spacing, getShadow } from '@/constants/portal';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = ViewProps & {
  padded?: boolean;
};

export function Card({ style, children, padded = true, ...rest }: Props) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const bg = dark ? PortalColors.cardDark : PortalColors.cardLight;
  const border = dark ? PortalColors.borderDark : PortalColors.border;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, borderColor: border },
        getShadow(2),
        padded && styles.padded,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: {
    padding: Spacing.md,
  },
});
