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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api } from "../../api/client";
import { colors } from "../../theme/colors";
import { DatePickerField } from "../../components/DatePickerField";
import { ORDER_STATUS_LABELS } from "../../utils/labels";

type ReportItem = {
  orderId: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  address: string | null;
  clientName: string | null;
  clientPhone: string | null;
  orderStatus: string;
  assignmentStatus: string;
  hours: number;
  payout: number;
  payoutPaidAt: string | null;
  payoutMethod: string | null;
  slots: { characterName: string; durationMin: number }[];
};

type ReleaseItem = {
  assignmentId: string;
  orderId: string;
  orderTitle: string;
  eventDate: string;
  status: "declined" | "removed";
  releaseReason: string | null;
  releaseComment: string | null;
  releasedAt: string;
  payout: number;
};

type Report = {
  period: { from: string; to: string };
  scope: string;
  summary: {
    ordersCount: number;
    hours: number;
    payoutTotal: number;
    payoutPaid: number;
    payoutPaidCash: number;
    payoutPaidTransfer: number;
    payoutRemaining: number;
    acceptedCount: number;
    declinedCount: number;
    removedCount: number;
    offersCount: number;
    acceptRate: number;
    lostPayout: number;
    byReason: Record<string, number>;
  };
  releases: ReleaseItem[];
  items: ReportItem[];
};

type Preset = "this_month" | "last_month" | "this_year" | "custom";
type Scope = "all" | "past" | "future";

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getPreset(p: Exclude<Preset, "custom">): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (x: number) => String(x).padStart(2, "0");
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

function todayISO() {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function AnimatorReportScreen() {
  const navigation = useNavigation<any>();

  const [preset, setPreset] = useState<Preset>("this_month");
  const [customFrom, setCustomFrom] = useState(todayISO().slice(0, 8) + "01");
  const [customTo, setCustomTo] = useState(todayISO());

  const [scope, setScope] = useState<Scope>("all");
  const [orderStatus, setOrderStatus] = useState<string>("");

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { from, to } =
        preset === "custom" ? { from: customFrom, to: customTo } : getPreset(preset);
      const params = new URLSearchParams({ from, to, scope });
      if (orderStatus) params.set("status", orderStatus);
      const { data } = await api.get<Report>(`/api/animators/me/report?${params.toString()}`);
      setReport(data);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить отчёт");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [preset, customFrom, customTo, scope, orderStatus]);

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

  const listHeader = (
    <>
      <View style={styles.presetsRow}>
        {([
          { key: "this_month", label: "Месяц" },
          { key: "last_month", label: "Прошлый" },
          { key: "this_year", label: "Год" },
          { key: "custom", label: "Свой" },
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

      {preset === "custom" ? (
        <View style={styles.card}>
          <DatePickerField value={customFrom} onChange={setCustomFrom} label="От" />
          <DatePickerField value={customTo} onChange={setCustomTo} label="До" />
        </View>
      ) : null}

      <View style={styles.scopeRow}>
        {([
          { key: "all", label: "Все" },
          { key: "past", label: "Прошедшие" },
          { key: "future", label: "Будущие" },
        ] as const).map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.scopeBtn, scope === s.key && styles.scopeBtnActive]}
            onPress={() => setScope(s.key)}
          >
            <Text style={[styles.scopeText, scope === s.key && styles.scopeTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chipsRow}>
        {[
          { value: "", label: "Все статусы" },
          { value: "new", label: ORDER_STATUS_LABELS.new },
          { value: "confirmed", label: ORDER_STATUS_LABELS.confirmed },
          { value: "in_progress", label: ORDER_STATUS_LABELS.in_progress },
          { value: "completed", label: ORDER_STATUS_LABELS.completed },
        ].map((s) => (
          <TouchableOpacity
            key={s.value || "all"}
            style={[styles.chip, orderStatus === s.value && styles.chipActive]}
            onPress={() => setOrderStatus(s.value)}
          >
            <Text style={[styles.chipText, orderStatus === s.value && styles.chipTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {report ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Сводка</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{report.summary.ordersCount}</Text>
              <Text style={styles.metricLabel}>Заказов</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{report.summary.hours}</Text>
              <Text style={styles.metricLabel}>Часов</Text>
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
          {report.summary.payoutPaidCash > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.subLabel}>— наличными</Text>
              <Text style={styles.subValue}>{fmt(report.summary.payoutPaidCash)} ₽</Text>
            </View>
          ) : null}
          {report.summary.payoutPaidTransfer > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.subLabel}>— переводом</Text>
              <Text style={styles.subValue}>{fmt(report.summary.payoutPaidTransfer)} ₽</Text>
            </View>
          ) : null}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandLabel}>К выплате</Text>
            <Text style={styles.grandValue}>{fmt(report.summary.payoutRemaining)} ₽</Text>
          </View>
        </View>
      ) : null}

      {report ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Отказы и снятия</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{report.summary.declinedCount}</Text>
              <Text style={styles.metricLabel}>Отказался</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{report.summary.removedCount}</Text>
              <Text style={styles.metricLabel}>Снят</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{report.summary.acceptRate}%</Text>
              <Text style={styles.metricLabel}>Принятие</Text>
            </View>
          </View>

          {report.summary.lostPayout > 0 ? (
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandLabel}>Упущено из-за отказов</Text>
              <Text style={[styles.grandValue, { color: colors.danger }]}>
                {fmt(report.summary.lostPayout)} ₽
              </Text>
            </View>
          ) : null}

          {report.releases.length > 0 ? (
            <View style={{ marginTop: 10 }}>
              {report.releases.slice(0, 10).map((r) => (
                <View key={r.assignmentId} style={styles.releaseRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.releaseTitle} numberOfLines={1}>
                      {r.orderTitle}
                    </Text>
                    <Text style={styles.releaseMeta}>
                      {new Date(r.eventDate).toLocaleDateString("ru-RU")} ·{" "}
                      {r.status === "declined" ? "отказ" : "снят"}
                    </Text>
                    {r.releaseComment ? (
                      <Text style={styles.releaseComment} numberOfLines={2}>
                        «{r.releaseComment}»
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.releaseLoss}>−{fmt(r.payout)} ₽</Text>
                </View>
              ))}
              {report.releases.length > 10 ? (
                <Text style={styles.releaseMore}>
                  …и ещё {report.releases.length - 10}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.muted, { marginTop: 8, textAlign: "left" }]}>
              За период отказов не было
            </Text>
          )}
        </View>
      ) : null}

      {report && report.items.length > 0 ? (
        <Text style={styles.listTitle}>Заказы · тап, чтобы открыть</Text>
      ) : null}
    </>
  );

  return (
    <FlatList
      data={report?.items ?? []}
      keyExtractor={(x) => x.orderId}
      contentContainerStyle={{ padding: 12, backgroundColor: colors.bg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.muted}>За выбранный период заказов нет</Text>
        </View>
      }
      renderItem={({ item }) => {
        const isFuture = new Date(item.eventDate) >= new Date();
        return (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.itemCard, isFuture && styles.itemCardFuture]}
            onPress={() => openOrder(item.orderId)}
          >
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                  {new Date(item.eventDate).toLocaleDateString("ru-RU")} · {item.startTime}–
                  {item.endTime} · {item.hours} ч
                </Text>
                {item.address ? <Text style={styles.itemMeta}>{item.address}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.payout}>{fmt(item.payout)} ₽</Text>
                {item.payoutPaidAt ? (
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
                  {ORDER_STATUS_LABELS[item.orderStatus as keyof typeof ORDER_STATUS_LABELS] ??
                    item.orderStatus}
                </Text>
              </View>
              {isFuture ? (
                <View style={[styles.badge, { backgroundColor: colors.primary, marginLeft: 6 }]}>
                  <Text style={styles.badgeText}>Будущий</Text>
                </View>
              ) : null}
              <Text style={styles.openHint}>Открыть →</Text>
            </View>
          </TouchableOpacity>
        );
      }}
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

  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },

  scopeRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
    gap: 4,
  },
  scopeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  scopeBtnActive: { backgroundColor: colors.primary },
  scopeText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  scopeTextActive: { color: "#fff" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  metricLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  totalLabel: { fontSize: 14, color: colors.textMuted },
  totalValue: { fontSize: 15, color: colors.text, fontWeight: "600" },
  subLabel: { fontSize: 12, color: colors.textMuted, paddingLeft: 12 },
  subValue: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6, paddingTop: 10 },
  grandLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  grandValue: { fontSize: 20, fontWeight: "800", color: colors.primary },

  listTitle: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },

  itemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.textMuted,
  },
  itemCardFuture: { borderLeftColor: colors.primary },
  rowTop: { flexDirection: "row", gap: 8 },
  itemTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  payout: { fontSize: 16, fontWeight: "800", color: colors.text },
  badge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  statusRow: { flexDirection: "row", marginTop: 6, flexWrap: "wrap", alignItems: "center", gap: 6 },
  openHint: { fontSize: 11, color: colors.primary, fontWeight: "700", marginLeft: "auto" },

  releaseRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  releaseTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  releaseMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  releaseComment: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: 3,
  },
  releaseLoss: { fontSize: 13, fontWeight: "700", color: colors.danger },
  releaseMore: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: "center",
  },
});