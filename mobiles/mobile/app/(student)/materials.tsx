import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/portal/card';
import { PageHeader } from '@/components/portal/page-header';
import { SectionHeader } from '@/components/portal/section-header';
import { PortalColors, Spacing } from '@/constants/portal';

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
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <PageHeader
          badge="Academics"
          title="Materials"
          subtitle="Central place for syllabi, notices, and unit resources. Connect your CMS later to load live documents."
        />

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.block}>
            <SectionHeader title={section.title} />
            <Card>
              {section.items.map((line) => (
                <View key={line} style={styles.row}>
                  <View style={styles.dot} />
                  <Text style={styles.line}>
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
    backgroundColor: PortalColors.stone,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  block: {
    marginBottom: Spacing.lg,
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
    color: PortalColors.slate,
  },
});
