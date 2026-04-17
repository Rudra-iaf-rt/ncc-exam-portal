import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/portal/primary-button';
import { PortalColors, Radius, Spacing, getShadow } from '@/constants/portal';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ResultScreenProps = {
  /** Backend score 0–100 (percentage). */
  score: number;
  total: number;
  correct?: number;
  examTitle?: string;
};

export function ResultScreen({ score, total, correct, examTitle }: ResultScreenProps) {
  const router = useRouter();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const bg = dark ? '#0f172a' : '#f8fafc';

  const pctFromCorrect =
    correct != null && total > 0 ? Math.round((correct / total) * 100) : score;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Text style={[styles.headline, { color: dark ? '#f8fafc' : PortalColors.navy }]}>
          Results
        </Text>
        {examTitle ? <Text style={styles.subtitle}>{examTitle}</Text> : null}

        <View
          style={[
            styles.card,
            {
              backgroundColor: dark ? PortalColors.cardDark : '#fff',
              borderColor: dark ? PortalColors.borderDark : PortalColors.border,
            },
            getShadow(3),
          ]}>
          <Text style={styles.label}>Score</Text>
          <Text style={styles.scoreBig}>{score}%</Text>

          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Total questions</Text>
              <Text style={[styles.cellValue, dark && styles.cellValueDark]}>{total}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Percentage</Text>
              <Text style={[styles.cellValue, dark && styles.cellValueDark]}>{pctFromCorrect}%</Text>
            </View>
          </View>

          {correct != null ? (
            <Text style={styles.correctLine}>
              Correct answers: {correct} / {total}
            </Text>
          ) : null}
        </View>

        <PrimaryButton title="Back to dashboard" onPress={() => router.replace('/(student)')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: PortalColors.muted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: PortalColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreBig: {
    fontSize: 56,
    fontWeight: '800',
    color: PortalColors.accent,
    marginVertical: Spacing.md,
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    marginTop: Spacing.md,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  cellLabel: {
    fontSize: 12,
    color: PortalColors.muted,
    marginBottom: 4,
  },
  cellValue: {
    fontSize: 22,
    fontWeight: '700',
    color: PortalColors.navy,
  },
  cellValueDark: {
    color: '#f1f5f9',
  },
  divider: {
    width: 1,
    backgroundColor: PortalColors.border,
    marginHorizontal: Spacing.sm,
  },
  correctLine: {
    marginTop: Spacing.lg,
    fontSize: 15,
    color: PortalColors.slate,
  },
});
