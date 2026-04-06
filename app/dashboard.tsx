import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "../components/ui/Card";
import { Screen } from "../components/ui/Screen";
import { Colors, Radius, Spacing } from "../constants/theme";
import { useAuth } from "../context/auth-context";

type DashCard = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: "/materials" | "/exams" | "/results-view";
  color: string;
};

const CARDS: DashCard[] = [
  {
    key: "materials",
    title: "Study materials",
    subtitle: "Syllabus, PDFs, and unit notes",
    icon: "library-outline",
    href: "/materials",
    color: Colors.primary,
  },
  {
    key: "exams",
    title: "Exams",
    subtitle: "View and attempt scheduled tests",
    icon: "document-text-outline",
    href: "/exams",
    color: "#0EA5E9",
  },
  {
    key: "results",
    title: "My results",
    subtitle: "Scores and completed attempts",
    icon: "ribbon-outline",
    href: "/results-view",
    color: Colors.success,
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout, token, loading } = useAuth();

  if (!loading && !token) {
    return <Redirect href="/login" />;
  }

  async function onLogout() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await logout();
    router.replace("/login");
  }

  return (
    <Screen scroll contentStyle={styles.pad}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name ?? "?")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        </View>
        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.outlineBtnText}>Log out</Text>
        </Pressable>
      </View>

      <Text style={styles.greeting}>Welcome back</Text>
      <Text style={styles.name}>{user?.name ?? "Cadet"}</Text>
      <Text style={styles.meta}>
        {user?.regimentalNumber ?? "—"} · {user?.college ?? ""}
      </Text>

      <Text style={styles.sectionLabel}>Quick actions</Text>
      <View style={styles.cards}>
        {CARDS.map((c) => (
          <Card
            key={c.key}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(c.href);
            }}
            style={styles.card}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconCircle, { backgroundColor: `${c.color}18` }]}>
                <Ionicons name={c.icon} size={24} color={c.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardSub}>{c.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
    color: Colors.primary,
    fontSize: 15,
  },
  outlineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  greeting: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  name: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  meta: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  cards: {
    gap: Spacing.sm,
  },
  card: {
    paddingVertical: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },
  cardSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
