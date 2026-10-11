import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { colors } from "../../theme/colors";
import { ORDER_STATUS_LABELS } from "../../utils/labels";
import type { Order } from "../../api/types";
import {
  fetchAvailability,
  fetchFinanceSummary,
  fetchOrdersCount,
  fetchOrdersList,
} from "../../api/dashboard";
import { fetchPendingApproval } from "../../api/handover";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function firstDayOfMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function lastDayOfMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtMoney(v: any): string {
  return Number(v || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

type DashboardData = {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  freeAnimators: number;
  totalAnimators: number;
  noAnimators: number;
  noPrepayment: number;
  pendingHandover: number;
  cashThisMonth: number | null;
  incomeThisMonth: number | null;
  paidPayoutsThisMonth: number | null;
  otherExpensesThisMonth: number | null;
  upcoming: Order[];
  needAssign: Order[];
  needPrepayment: Order[];
};

export function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isDirector = user?.role === "director";

  const today = useMemo(() => todayIso(), []);
  const weekAhead = useMemo(() => addDays(today, 7), [today]);
  const monthFrom = useMemo(() => firstDayOfMonth(), []);
  const monthTo = useMemo(() => lastDayOfMonth(), []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  const load = useCallback(async () => {
    try {
      const [
        todayCount,
        weekCount,
        monthCount,
        availability,
        noAnimators,
        noPrepayment,
        upcoming,
        needAssign,
        needPrepayment,
        pendingHandover,
        finance,
      ] = await Promise.all([
        fetchOrdersCount({ dateFrom: today, dateTo: today }),
        fetchOrdersCount({ dateFrom: today, dateTo: weekAhead }),
        fetchOrdersCount({ dateFrom: monthFrom, dateTo: monthTo }),
        fetchAvailability(today),
        fetchOrdersCount({ dateFrom: today, dateTo: weekAhead, hasUnassignedSlots: "true" }),
        isDirector
          ? fetchOrdersCount({ dateFrom: today, dateTo: weekAhead, prepaymentPaid: "false" })
          : Promise.resolve(0),
        fetchOrdersList({ dateFrom: today, dateTo: addDays(today, 30), limit: 5 }),
        fetchOrdersList({ dateFrom: today, dateTo: weekAhead, hasUnassignedSlots: "true", limit: 5 }),
        isDirector
          ? fetchOrdersList({ dateFrom: today, dateTo: weekAhead, prepaymentPaid: "false", limit: 5 })
          : Promise.resolve([] as Order[]),
        fetchPendingApproval(),
        isDirector
          ? fetchFinanceSummary(monthFrom, monthTo)
          : Promise.resolve(null),
      ]);

      const freeAnimators = availability.filter((a) => {
        const busy = (a.orders ?? []).some((o) => o.orderStatus !== "cancelled");
        return !busy;
      });

      setData({
        todayCount,
        weekCount,
        monthCount,
        freeAnimators: freeAnimators.length,
        totalAnimators: availability.length,
        noAnimators,
        noPrepayment,
        pendingHandover: pendingHandover.length,
        cashThisMonth: finance ? finance.cashProfit : null,
        incomeThisMonth: finance ? finance.income.total : null,
        paidPayoutsThisMonth: finance ? finance.paidPayouts : null,
        otherExpensesThisMonth: finance ? finance.otherExpenses : null,
        upcoming,
        needAssign,
        needPrepayment,
      });
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить сводку");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today, weekAhead, monthFrom, monthTo, isDirector]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openOrder = (orderId: string) => {
    navigation.navigate("OrderDetail", { orderId });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      {data.pendingHandover > 0 ? (
        <TouchableOpacity
          style={styles.handoverBanner}
          activeOpacity={0.7}
          onPress={() => {
            // заявки — только на просмотр, действий нет в мобилке
          }}
        >
          <Text style={styles.handoverTitle}>
            📥 Заявки на передачу заказов: {data.pendingHandover}
          </Text>
          <Text style={styles.handoverHint}>Ждут подтверждения руководителя</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.grid}>
        <MetricCard
          label="Заказов сегодня"
          value={String(data.todayCount)}
          hint={`${data.weekCount} за 7 дней · ${data.monthCount} за месяц`}
        />
        <MetricCard
          label="Свободные аниматоры"
          value={`${data.freeAnimators} / ${data.totalAnimators}`}
          hint="Сегодня"
          color="emerald"
        />
        <MetricCard
          label="Без аниматора"
          value={String(data.noAnimators)}
          hint="На 7 дней"
          color={data.noAnimators > 0 ? "red" : "gray"}
        />
        {isDirector ? (
          <MetricCard
            label="Без предоплаты"
            value={String(data.noPrepayment)}
            hint="На 7 дней"
            color={data.noPrepayment > 0 ? "amber" : "gray"}
          />
        ) : null}
      </View>

      {isDirector && data.cashThisMonth !== null ? (
        <View style={styles.card}>
          <Text style={styles.section}>Касса за текущий месяц</Text>
          <Text style={styles.cashValue}>{fmtMoney(data.cashThisMonth)} ₽</Text>
          <View style={styles.divider} />
          <View style={styles.cashRow}>
            <Text style={styles.cashRowLabel}>Пришло</Text>
            <Text style={styles.cashRowValue}>{fmtMoney(data.incomeThisMonth ?? 0)} ₽</Text>
          </View>
          <View style={styles.cashRow}>
            <Text style={styles.cashRowLabel}>Выплачено аниматорам</Text>
            <Text style={styles.cashRowValue}>{fmtMoney(data.paidPayoutsThisMonth ?? 0)} ₽</Text>
          </View>
          <View style={styles.cashRow}>
            <Text style={styles.cashRowLabel}>Прочие расходы</Text>
            <Text style={styles.cashRowValue}>{fmtMoney(data.otherExpensesThisMonth ?? 0)} ₽</Text>
          </View>
        </View>
      ) : null}

      <SectionList
        title="Ближайшие заказы"
        empty="Нет ближайших заказов"
        items={data.upcoming}
        onPress={openOrder}
      />

      <SectionList
        title="Требуют назначения аниматора"
        empty="Все заказы укомплектованы ✓"
        items={data.needAssign}
        onPress={openOrder}
        accent="red"
      />

      {isDirector ? (
        <SectionList
          title="Ожидают предоплату"
          empty="Все предоплаты получены ✓"
          items={data.needPrepayment}
          onPress={openOrder}
          accent="amber"
        />
      ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  label,
  value,
  hint,
  color = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  color?: "primary" | "emerald" | "amber" | "red" | "gray";
}) {
  const colorStyle =
    color === "emerald"
      ? { color: colors.success }
      : color === "amber"
        ? { color: colors.warning }
        : color === "red"
          ? { color: colors.danger }
          : color === "gray"
            ? { color: colors.text }
            : { color: colors.primary };
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, colorStyle]}>{value}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </View>
  );
}

function SectionList({
  title,
  empty,
  items,
  onPress,
  accent,
}: {
  title: string;
  empty: string;
  items: Order[];
  onPress: (orderId: string) => void;
  accent?: "red" | "amber";
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.section}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.emptyText}>{empty}</Text>
      ) : (
        items.map((o) => (
          <TouchableOpacity
            key={o.id}
            style={styles.orderRow}
            activeOpacity={0.7}
            onPress={() => onPress(o.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.orderTitle} numberOfLines={1}>
                {o.title}
              </Text>
              <Text style={styles.orderMeta}>
                {fmtDateShort(o.eventDate)} · {o.startTime}–{o.endTime}
              </Text>
            </View>
            <Text style={styles.orderChevron}>›</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  container: { padding: 12 },
  handoverBanner: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f59e0b",
    padding: 14,
    marginBottom: 10,
  },
  handoverTitle: { fontSize: 14, fontWeight: "700", color: "#92400e" },
  handoverHint: { fontSize: 12, color: "#b45309", marginTop: 4 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  metricCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    width: "48%",
    flexGrow: 1,
  },
  metricLabel: { fontSize: 12, color: colors.textMuted },
  metricValue: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  metricHint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  section: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  emptyText: { fontSize: 13, color: colors.success, fontStyle: "italic" },
  cashValue: { fontSize: 28, fontWeight: "800", color: colors.success, marginBottom: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  cashRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  cashRowLabel: { fontSize: 13, color: colors.textMuted },
  cashRowValue: { fontSize: 13, color: colors.text, fontWeight: "600" },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  orderMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  orderChevron: { fontSize: 24, color: colors.textMuted, paddingHorizontal: 6 },
});
