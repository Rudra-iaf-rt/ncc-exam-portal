import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { PortalColors, Radius, Spacing } from '@/constants/portal';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export const Field = forwardRef<TextInput, Props>(function Field(
  { label, error, style, ...rest },
  ref
) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const bg = dark ? PortalColors.cardDark : PortalColors.cardLight;
  const border = error ? PortalColors.danger : dark ? PortalColors.borderDark : PortalColors.border;
  const color = dark ? '#f1f5f9' : PortalColors.navy;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: dark ? '#94a3b8' : PortalColors.muted }]}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={dark ? '#64748b' : '#94a3b8'}
        style={[styles.input, { backgroundColor: bg, borderColor: border, color }, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    color: PortalColors.danger,
    fontSize: 12,
    marginTop: 4,
  },
});
