import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/portal/card';
import { PortalColors, Spacing } from '@/constants/portal';
import { useColorScheme } from '@/hooks/use-color-scheme';

const SECTIONS = [
  {
    title: 'Drill & parade',
    items: ['Dress regulations summary', 'Quick-march cadence notes', 'Ceremonial sequence checklist'],
  },
  {
    title: 'Academic',
    items: ['Course outline — NCC theory', 'Recommended reading list', 'Assignment submission guidelines'],
  },
  {
    title: 'Notices',
    items: ['Unit orders will appear here when published', 'Contact your instructor for sealed materials'],
  },
];

export default function MaterialsScreen() {
  const scheme = useColorScheme();
  const bg = scheme === 'dark' ? '#0f172a' : '#f8fafc';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.headline, { color: scheme === 'dark' ? '#f1f5f9' : PortalColors.navy }]}>
          Materials
        </Text>
        <Text style={styles.lead}>
          Central place for syllabi, notices, and unit resources. Connect your CMS later to load live
          documents.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.block}>
            <Text style={[styles.sectionTitle, { color: PortalColors.muted }]}>{section.title}</Text>
            <Card>
              {section.items.map((line) => (
                <View key={line} style={styles.row}>
                  <View style={styles.dot} />
                  <Text
                    style={[
                      styles.line,
                      { color: scheme === 'dark' ? '#e2e8f0' : PortalColors.slate },
                    ]}>
                    {line}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: PortalColors.muted,
    marginBottom: Spacing.xl,
  },
  block: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PortalColors.accent,
    marginTop: 7,
    marginRight: Spacing.sm,
  },
  line: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
});
