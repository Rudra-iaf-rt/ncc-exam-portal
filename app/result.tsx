import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../components/ui/PrimaryButton";
import { Screen } from "../components/ui/Screen";
import { Colors, Radius, Spacing } from "../constants/theme";

export default function ResultScreen() {
  const router = useRouter();
  const { score, correct, total, examTitle } = useLocalSearchParams<{
    score: string;
    correct: string;
    total: string;
    examTitle: string;
  }>();

  const scoreNum = Number(score);
  const correctNum = Number(correct);
  const totalNum = Number(total);
  const pct = Number.isFinite(scoreNum) ? scoreNum : 0;

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <Screen scroll contentStyle={styles.pad}>
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
      </View>
      <Text style={styles.badge}>Exam submitted</Text>
      <Text style={styles.title} numberOfLines={2}>
        {examTitle ?? "Exam"}
      </Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Your score</Text>
        <Text style={styles.scoreHuge}>{pct}%</Text>
        <Text style={styles.scoreDetail}>
          {Number.isFinite(correctNum) && Number.isFinite(totalNum)
            ? `${correctNum} of ${totalNum} correct`
            : ""}
        </Text>
      </View>

      <Text style={styles.note}>
        Results are saved to your record. You can review past attempts from the dashboard.
      </Text>

      <PrimaryButton
        label="Back to dashboard"
        onPress={() => router.replace("/dashboard")}
        style={styles.btn}
      />
      <PrimaryButton
        label="View my results"
        variant="outline"
        onPress={() => router.replace("/results-view")}
        style={styles.btn2}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    alignItems: "center",
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  badge: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.success,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 28,
  },
  scoreCard: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: "600",
    marginBottom: 4,
  },
  scoreHuge: {
    fontSize: 56,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: -2,
  },
  scoreDetail: {
    marginTop: 8,
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  note: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: Spacing.lg,
    maxWidth: 320,
  },
  btn: {
    width: "100%",
    maxWidth: 360,
  },
  btn2: {
    width: "100%",
    maxWidth: 360,
    marginTop: Spacing.sm,
  },
});
