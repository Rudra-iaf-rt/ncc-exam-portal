import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Spacing } from "../../constants/theme";

type Props = {
  title: string;
};

export function BackHeader({ title }: Props) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.65 }]}
        hitSlop={12}
      >
        <Ionicons name="chevron-back" size={26} color={Colors.primary} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: 4,
  },
  back: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  spacer: {
    width: 30,
  },
});
