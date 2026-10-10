import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../api/client";
import { fetchMyIncoming } from "../../api/handover";
import type { ListResponse, Order } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { colors } from "../../theme/colors";
import {
  ASSIGNMENT_STATUS_COLORS,
  ASSIGNMENT_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from "../../utils/labels";
import type { AnimatorOrdersStackParamList } from "./AnimatorOrdersStack";

type Nav = NativeStackNavigationProp<AnimatorOrdersStackParamList, "OrdersList">;

export function AnimatorOrdersScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incomingCount, setIncomingCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ListResponse<Order>>("/api/orders");
      setItems(data.items);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    try {
      const incoming = await fetchMyIncoming();
      setIncomingCount(
        incoming.filter((h) => h.status === "pending_receiver").length,
      );
    } catch {
      // счётчик не критичен
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const getMyAssignment = (order: Order) => {
    if (!user) return undefined;
    return order.animators?.find((a) => a.animatorId === user.id);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[
              styles.headerBtn,
              incomingCount > 0 && styles.headerBtnActive,
            ]}
            onPress={() => navigation.navigate("HandoverInbox")}
          >
            <Text
              style={[
                styles.headerBtnText,
                incomingCount > 0 && styles.headerBtnTextActive,
              ]}
            >
              📥 Входящие{incomingCount > 0 ? ` (${incomingCount})` : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate("HandoverOutgoing")}
          >
            <Text style={styles.headerBtnText}>📤 Мои заявки</Text>
          </TouchableOpacity>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.muted}>Пока нет заказов</Text>
        </View>
      }
      renderItem={({ item }) => {
        const my = getMyAssignment(item);
        const highlight = my?.status === "invited";
        return (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
            style={[styles.card, highlight && styles.cardHighlight]}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {new Date(item.eventDate).toLocaleDateString("ru-RU")} · {item.startTime}–{item.endTime}
            </Text>
            {item.address ? <Text style={styles.meta}>{item.address}</Text> : null}

            <View style={styles.row}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: ORDER_STATUS_COLORS[item.status] ?? colors.textMuted },
                ]}
              >
                <Text style={styles.badgeText}>
                  {ORDER_STATUS_LABELS[item.status] ?? item.status}
                </Text>
              </View>
              {my ? (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        ASSIGNMENT_STATUS_COLORS[my.status] ?? colors.textMuted,
                      marginLeft: 6,
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {ASSIGNMENT_STATUS_LABELS[my.status] ?? my.status}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardHighlight: { borderColor: colors.warning },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  row: { flexDirection: "row", marginTop: 10, flexWrap: "wrap" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  headerRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  headerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerBtnActive: {
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
  },
  headerBtnText: { fontSize: 14, fontWeight: "600", color: colors.text },
  headerBtnTextActive: { color: "#92400e" },
});