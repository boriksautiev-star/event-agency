import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import {
  fetchAnimatorReport,
  AnimatorReport,
} from "../../api/animators";
import { colors } from "../../theme/colors";
import type { StaffAnimatorsStackParamList } from "./StaffAnimatorsStack";
import { ORDER_STATUS_LABELS } from "../../utils/labels";

type RouteT = RouteProp<StaffAnimatorsStackParamList, "AnimatorReport">;

type Preset = "this_month" | "last_month" | "this_year";

const RELEASE_REASON_LABELS: Record<string, string> = {
  declined: "Отказ",
  handed_over: "Передал другому",
  removed_rotation: "Снят (ротация)",
  removed_quality: "Снят (качество)",
  order_cancelled: "Заказ отменён",
};

function fmt(n: number): string {
  return Number(n || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function getPreset(p: Preset): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = (yy: number, mm: number) => `${yy}-${pad(mm + 1)}-01`;
  const last = (yy: number, mm: number) => new Date(yy, mm + 1, 0);
  const f = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (p === "this_month") return { from: first(y, m), to: f(last(y, m)) };
  if (p === "last_month") {
    const lm = m === 0 ? 11 : m - 1;
    const ly = m === 0 ? y - 1 : y;
    return { from: first(ly, lm), to: f(last(ly, lm)) };
  }
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AnimatorReportByIdScreen() {
  const route = useRoute<RouteT>();
  const navigation = useNavigation();
  const { animatorId, animatorName } = route.params;

  const [preset, setPreset] = useState<Preset>("this_year");
  const [report, setReport] = useState<AnimatorReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { from, to } = getPreset(preset);
      const data = await fetchAnimatorReport(animatorId, { from, to, scope: "all" });
      setReport(data);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить отчёт");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [animatorId, preset]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  React.useEffect(() => {
    (navigation as any).setOptions({ title: "Отчёт" });
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const listHeader = (
    <>
      <View style={styles.presetsRow}>
        {([
          { key: "this_month", label: "Месяц" },
          { key: "last_month", label: "Прошлый" },
          { key: "this_year", label: "Год" },
        ] as const).map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.presetBtn, preset === p.key && styles.presetBtnActive]}
            onPress={() => setPreset(p.key)}
          >
            <Text style={[styles.presetText, preset === p.key && styles.presetTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {report ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Сводка — {animatorName}</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{report.summary.ordersCount}</Text>
                <Text style={styles.metricLabel}>Заказов</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{report.summary.acceptedCount}</Text>
                <Text style={styles.metricLabel}>Принял</Text>
              </View>
              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: colors.warning }]}>
                  {report.summary.declinedCount}
                </Text>
                <Text style={styles.metricLabel}>Отказался</Text>
              </View>
              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: colors.danger }]}>
                  {report.summary.removedCount}
                </Text>
                <Text style={styles.metricLabel}>Снят</Text>
              </View>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Начислено</Text>
              <Text style={styles.totalValue}>{fmt(report.summary.payoutTotal)} ₽</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Выплачено</Text>
              <Text style={[styles.totalValue, { color: colors.success }]}>
                {fmt(report.summary.payoutPaid)} ₽
              </Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandLabel}>К выплате</Text>
              <Text style={styles.grandValue}>{fmt(report.summary.payoutRemaining)} ₽</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Процент принятия</Text>
              <Text style={styles.totalValue}>{report.summary.acceptRate}%</Text>
            </View>

            {report.summary.lostPayout > 0 ? (
              <View style={[styles.totalRow, styles.lostRow]}>
                <Text style={styles.lostLabel}>Упущено из-за отказов аниматора</Text>
                <Text style={styles.lostValue}>
                  {fmt(report.summary.lostPayout)} ₽
                </Text>
              </View>
            ) : null}
          </View>

          {report.summary.offersCount > 0 ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Разбивка по причинам</Text>
              <View style={styles.reasonsGrid}>
                {Object.entries(report.summary.byReason).map(([k, v]) => (
                  <View key={k} style={styles.reasonItem}>
                    <Text style={styles.reasonValue}>{v}</Text>
                    <Text style={styles.reasonLabel}>
                      {RELEASE_REASON_LABELS[k] ?? k}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <Text style={styles.listTitle}>История расставаний с заказами</Text>
        </>
      ) : null}
    </>
  );

  const listFooter = report ? (
    <View>
      {report.items.length > 0 ? (
        <>
          <Text style={[styles.listTitle, { marginTop: 16 }]}>Отработанные заказы</Text>
          {report.items.map((it) => (
            <TouchableOpacity
              key={it.orderId}
              style={styles.itemCard}
              onPress={() =>
                (navigation as any).navigate("OrdersTab", {
                  screen: "OrderDetail",
                  params: { orderId: it.orderId },
                })
              }
            >
              <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{it.title}</Text>
                  <Text style={styles.itemMeta}>
                    {new Date(it.eventDate).toLocaleDateString("ru-RU")} · {it.startTime}–{it.endTime}
                  </Text>
                  {it.clientName ? (
                    <Text style={styles.itemMeta}>{it.clientName}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.payout}>{fmt(it.payout)} ₽</Text>
                  {it.payoutPaidAt ? (
                    <View style={[styles.badge, { backgroundColor: colors.success }]}>
                      <Text style={styles.badgeText}>Выплачено</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                      <Text style={styles.badgeText}>К выплате</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.statusRow}>
                <View style={[styles.badge, { backgroundColor: colors.textMuted }]}>
                  <Text style={styles.badgeText}>
                    {ORDER_STATUS_LABELS[it.orderStatus as keyof typeof ORDER_STATUS_LABELS] ??
                      it.orderStatus}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}
      <View style={{ height: 24 }} />
    </View>
  ) : null;

  return (
    <FlatList
      data={report?.releases ?? []}
      keyExtractor={(x) => x.assignmentId}
      contentContainerStyle={{ padding: 12, backgroundColor: colors.bg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.muted}>За период отказов и снятий не было</Text>
        </View>
      }
      ListFooterComponent={listFooter}
      renderItem={({ item }) => (
        <View style={styles.releaseCard}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.releaseTitle} numberOfLines={2}>
                {item.orderTitle}
              </Text>
              <Text style={styles.releaseMeta}>
                {new Date(item.eventDate).toLocaleDateString("ru-RU")} · {fmtDateTime(item.releasedAt)}
              </Text>
              {item.releaseComment ? (
                <Text style={styles.releaseComment}>«{item.releaseComment}»</Text>
              ) : null}
            </View>
            <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      item.status === "declined" ? colors.warning : colors.danger,
                  },
                ]}
              >
                <Text style={styles.badgeText}>
                  {RELEASE_REASON_LABELS[item.releaseReason ?? ""] ??
                    (item.status === "declined" ? "Отказ" : "Снят")}
                </Text>
              </View>
              <Text style={styles.lostLine}>−{fmt(item.payout)} ₽</Text>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  emptyBox: { paddingVertical: 40, alignItems: "center" },

  presetsRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
    gap: 4,
  },
  presetBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  presetBtnActive: { backgroundColor: colors.primary },
  presetText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  presetTextActive: { color: "#fff" },

  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  metricsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  metric: { alignItems: "center", flex: 1 },
  metricValue: { fontSize: 22, fontWeight: "800", color: colors.primary },
  metricLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: "center" },

  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  totalLabel: { fontSize: 14, color: colors.textMuted },
  totalValue: { fontSize: 15, color: colors.text, fontWeight: "600" },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 6,
    paddingTop: 10,
  },
  grandLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  grandValue: { fontSize: 20, fontWeight: "800", color: colors.primary },
  lostRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 6,
    paddingTop: 10,
  },
  lostLabel: { fontSize: 13, color: colors.danger },
  lostValue: { fontSize: 16, fontWeight: "800", color: colors.danger },

  reasonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  reasonItem: { width: "30%", alignItems: "center", paddingVertical: 6 },
  reasonValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  reasonLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: "center" },

  listTitle: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },

  releaseCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  releaseTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  releaseMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  releaseComment: {
    fontSize: 13,
    color: colors.text,
    fontStyle: "italic",
    marginTop: 4,
  },
  lostLine: { fontSize: 13, fontWeight: "700", color: colors.danger, marginTop: 6 },

  itemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  rowTop: { flexDirection: "row", gap: 8 },
  itemTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  payout: { fontSize: 16, fontWeight: "800", color: colors.text },
  badge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  statusRow: { flexDirection: "row", marginTop: 6, flexWrap: "wrap", alignItems: "center", gap: 6 },
});
