import React, { useCallback, useEffect, useRef, useState } from "react";
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
import type { ListResponse, Order } from "../../api/types";
import { colors } from "../../theme/colors";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "../../utils/labels";
import type { StaffOrdersStackParamList } from "./StaffOrdersStack";
import {
  EMPTY_FILTER,
  OrdersFilter,
  OrdersFilterModal,
  countActiveFilters,
} from "./OrdersFilterModal";

type Nav = NativeStackNavigationProp<StaffOrdersStackParamList, "OrdersList">;

type OrdersTab = "active" | "completed" | "all";

function buildQuery(f: OrdersFilter, tab: OrdersTab): string {
  const p = new URLSearchParams();
  // Явный статус в фильтре имеет приоритет над табом
  if (f.status) {
    p.append("status", f.status);
  } else if (tab === "active") {
    p.append("statusIn", "new,confirmed,in_progress");
  } else if (tab === "completed") {
    p.append("statusIn", "completed");
  }
  if (f.dateFrom) p.append("dateFrom", f.dateFrom);
  if (f.dateTo) p.append("dateTo", f.dateTo);
  if (f.rateGroupId) p.append("rateGroupId", f.rateGroupId);
  if (f.characterId) p.append("characterId", f.characterId);
  if (f.priceFrom) p.append("priceFrom", f.priceFrom.replace(",", "."));
  if (f.priceTo) p.append("priceTo", f.priceTo.replace(",", "."));
  if (f.hasAnimators !== "all") p.append("hasAnimators", f.hasAnimators);
  if (f.prepaymentPaid !== "all") p.append("prepaymentPaid", f.prepaymentPaid);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function StaffOrdersScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<OrdersFilter>(EMPTY_FILTER);
  const [filterModal, setFilterModal] = useState(false);

  const [tab, setTab] = useState<OrdersTab>("active");

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const tabRef = useRef(tab);
  tabRef.current = tab;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ListResponse<Order>>(
        `/api/orders${buildQuery(filtersRef.current, tabRef.current)}`,
      );
      setItems(data.items);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const switchTab = (next: OrdersTab) => {
    if (next === tab) return;
    setTab(next);
    tabRef.current = next;
    // Явный статус в фильтре сбрасываем — иначе конфликт с пресетом
    const cleaned = { ...filtersRef.current, status: "" };
    setFilters(cleaned);
    filtersRef.current = cleaned;
    setLoading(true);
    // Небольшая задержка, чтобы state успел обновиться
    setTimeout(() => load(), 0);
  };

  const applyFilters = (f: OrdersFilter) => {
    setFilters(f);
    filtersRef.current = f;
    setLoading(true);
    load();
  };

  const activeCount = countActiveFilters(filters);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.segment}>
        {([
          { v: "active", l: "Активные" },
          { v: "completed", l: "Выполненные" },
          { v: "all", l: "Все" },
        ] as { v: OrdersTab; l: string }[]).map((x) => (
          <TouchableOpacity
            key={x.v}
            style={[styles.segmentBtn, tab === x.v && styles.segmentBtnActive]}
            onPress={() => switchTab(x.v)}
          >
            <Text
              style={[
                styles.segmentText,
                tab === x.v && styles.segmentTextActive,
              ]}
            >
              {x.l}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}
          onPress={() => setFilterModal(true)}
        >
          <Text
            style={[styles.filterBtnText, activeCount > 0 && styles.filterBtnTextActive]}
          >
            Фильтры{activeCount > 0 ? ` (${activeCount})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.muted}>
              {activeCount > 0 ? "Ничего не найдено" : "Пока нет заказов"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
            style={styles.card}
          >
            <View style={styles.titleRow}>
              <Text style={[styles.title, { flex: 1 }]} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.price}>{Number(item.clientPrice || 0).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₽</Text>
            </View>
            <Text style={styles.when}>
              {new Date(item.eventDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })} · {item.startTime}–{item.endTime}
            </Text>
            {item.client ? <Text style={styles.client}>{item.client.name}</Text> : null}
            {item.acceptedAt ? (
              <Text style={styles.accepted}>
                Принят: {new Date(item.acceptedAt).toLocaleString("ru-RU", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </Text>
            ) : null}
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
              {(() => {
                const active = (item.animators ?? []).filter(
                  (a) => a.status !== "removed" && a.status !== "declined",
                );
                if (active.length > 0) {
                  return (
                    <View style={[styles.badge, { backgroundColor: colors.textMuted, marginLeft: 6 }]}>
                      <Text style={styles.badgeText}>
                        Аниматоров: {active.length}
                      </Text>
                    </View>
                  );
                }
                return (
                  <View style={[styles.badge, { backgroundColor: colors.alert, marginLeft: 6 }]}>
                    <Text style={styles.badgeText}>Нет аниматоров</Text>
                  </View>
                );
              })()}
            </View>
          </TouchableOpacity>
        )}
      />

      <OrdersFilterModal
        visible={filterModal}
        value={filters}
        onClose={() => setFilterModal(false)}
        onApply={applyFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 12,
    marginTop: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  segmentTextActive: { color: "#fff" },
  toolbar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: "row",
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  filterBtnTextActive: { color: "#fff" },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  price: { fontSize: 16, fontWeight: "800", color: colors.accent },
  title: { fontSize: 16, fontWeight: "700", color: colors.accent },
  when: { fontSize: 15, fontWeight: "700", color: colors.accent, marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  client: { fontSize: 13, color: colors.accent, marginTop: 4, fontWeight: "600" },
  accepted: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  row: { flexDirection: "row", marginTop: 10, flexWrap: "wrap" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});