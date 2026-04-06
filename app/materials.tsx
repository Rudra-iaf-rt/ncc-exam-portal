import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BackHeader } from "../components/ui/BackHeader";
import { Card } from "../components/ui/Card";
import { Screen } from "../components/ui/Screen";
import { Colors, Spacing } from "../constants/theme";
import { useAuth } from "../context/auth-context";
import { api, getErrorMessage } from "../lib/api";

type MaterialRow = {
  id: number;
  title: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MaterialsScreen() {
  const { token, loading: authLoading } = useAuth();
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<{ materials: MaterialRow[] }>("/api/materials");
      setMaterials(data.materials);
    } catch (e) {
      setError(getErrorMessage(e, "Could not load materials"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!authLoading && !token) {
    return <Redirect href="/login" />;
  }

  async function onOpen(row: MaterialRow) {
    if (!token) {
      Alert.alert("Session", "Please sign in again.");
      return;
    }
    const base = (api.defaults.baseURL ?? "").replace(/\/$/, "");
    const url = `${base}${row.downloadUrl}`;
    const safeName = row.originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const baseDir =
      FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
    const dest = `${baseDir}material_${row.id}_${safeName}`;

    setDownloadingId(row.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await FileSystem.downloadAsync(url, dest, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: row.mimeType,
          dialogTitle: row.title ?? row.originalName,
        });
      } else {
        Alert.alert("Downloaded", "File saved to app cache.");
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Download failed", getErrorMessage(e, "Try again later."));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Screen>
      <View style={styles.pad}>
        <BackHeader title="Materials" />
        <Text style={styles.lead}>
          Study notes and documents shared by your instructors. Tap a card to download or share.
        </Text>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} size="large" />
        ) : error ? (
          <Text style={styles.err}>{error}</Text>
        ) : (
          <FlatList
            data={materials}
            keyExtractor={(item) => String(item.id)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primary} />
            }
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>No materials uploaded yet.</Text>
            }
            renderItem={({ item }) => (
              <Card
                onPress={() => void onOpen(item)}
                style={styles.card}
              >
                <View style={styles.cardInner}>
                  <View style={styles.iconBox}>
                    <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{item.title ?? item.originalName}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {item.originalName} · {formatSize(item.sizeBytes)}
                    </Text>
                  </View>
                  {downloadingId === item.id ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    <Ionicons name="download-outline" size={24} color={Colors.primary} />
                  )}
                </View>
              </Card>
            )}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  lead: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  loader: { marginTop: 48 },
  err: { color: Colors.danger, marginTop: Spacing.md },
  list: { paddingBottom: 40, gap: Spacing.sm },
  card: { marginBottom: 0 },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  cardMeta: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  empty: {
    textAlign: "center",
    color: Colors.textMuted,
    marginTop: 32,
    fontSize: 15,
  },
});
