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
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../api/client";
import { colors } from "../../theme/colors";
import { DatePickerField } from "../../components/DatePickerField";

type PaymentType = "prepayment" | "final" | "refund";
type PaymentMethodT = "transfer" | "cash";

type PaymentItem = {
  id: string;
  orderId: string;
  order: {
    id: string;
    title: string;
    eventDate: string;
    status: string;
    client: { id: string; name: string; phone: string };
  };
  type: PaymentType;
  amount: number;
  method: PaymentMethodT;
  paidAt: string;
  comment: string | null;
  createdBy: string | null;
  createdAt: string;
};

type Preset = "this_month" | "last_month" | "this_year" | "custom";
type TypeFilter = "all" | PaymentType;
type MethodFilter = "all" | PaymentMethodT;

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getPreset(preset: Exclude<Preset, "custom">): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (x: number) => String(x).padStart(2, "0");
  const firstDay = (yy: number, mm: number) => `${yy}-${pad(mm + 1)}-01`;
  const lastDay = (yy: number, mm: number) => new Date(yy, mm + 1, 0);
  const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === "this_month") return { from: firstDay(y, m), to: fmtDate(lastDay(y, m)) };
  if (preset === "last_month") {
    const lm = m === 0 ? 11 : m - 1;
    const ly = m === 0 ? y - 1 : y;
    return { from: firstDay(ly, lm), to: fmtDate(lastDay(ly, lm)) };
  }
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TYPE_LABELS: Record<PaymentType, string> = {
  prepayment: "Предоплата",
  final: "Финал",
  refund: "Возврат",
};

const METHOD_LABELS: Record<PaymentMethodT, string> = {
  transfer: "Перевод",
  cash: "Наличные",
};

function typeColor(t: PaymentType): string {
  if (t === "refund") return colors.danger;
  if (t === "final") return colors.success;
  return colors.primary;
}

export function FinancePaymentsScreen() {
  const [preset, setPreset] = useState<Preset>("this_month");
  const [customFrom, setCustomFrom] = useState(todayISO().slice(0, 8) + "01");
  const [customTo, setCustomTo] = useState(todayISO());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");

  const [items, setItems] = useState<PaymentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [sum, setSum] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentPeriod = () => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return getPreset(preset);
  };

  const load = useCallback(async () => {
    try {
      const { from, to } = currentPeriod();
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (methodFilter !== "all") params.set("method", methodFilter);
      const { data } = await api.get<{ items: PaymentItem[]; total: number; sum: number }>(
        `/api/finance/payments?${params.toString()}`,
      );
      setItems(data.items);
      setTotal(data.total);
      setSum(data.sum);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить поступления");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo, typeFilter, methodFilter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
            onPress={() => {
              setPreset(p.key);
              setLoading(true);
            }}
          >
            <Text style={[styles.presetText, preset === p.key && styles.presetTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {preset === "custom" ? (
        <View style={styles.customPeriod}>
          <DatePickerField value={customFrom} onChange={setCustomFrom} label="От" />
          <DatePickerField value={customTo} onChange={setCustomTo} label="До" />
        </View>
      ) : null}

      <View style={styles.chipsRow}>
        {([
          { key: "all", label: "Все" },
          { key: "prepayment", label: "Предоплата" },
          { key: "final", label: "Финал" },
          { key: "refund", label: "Возврат" },
        ] as const).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, typeFilter === f.key && styles.chipActive]}
            onPress={() => {
              setTypeFilter(f.key);
              setLoading(true);
            }}
          >
            <Text style={[styles.chipText, typeFilter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chipsRow}>
        {([
          { key: "all", label: "Все" },
          { key: "transfer", label: "Перевод" },
          { key: "cash", label: "Наличные" },
        ] as const).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, methodFilter === f.key && styles.chipActive]}
            onPress={() => {
              setMethodFilter(f.key);
              setLoading(true);
            }}
          >
            <Text style={[styles.chipText, methodFilter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sumBar}>
        <Text style={styles.sumLabel}>Итого: {total}</Text>
        <Text style={styles.sumValue}>{fmt(sum)} ₽</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.muted}>Пусто</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = typeColor(item.type);
          return (
            <View style={styles.card}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: color }]}>
                      <Text style={styles.badgeText}>{TYPE_LABELS[item.type]}</Text>
                    </View>
                    <Text style={styles.methodLabel}>{METHOD_LABELS[item.method]}</Text>
                  </View>
                  <Text style={styles.orderTitle}>{item.order.title}</Text>
                  <Text style={styles.clientName}>{item.order.client?.name ?? "—"}</Text>
                  <Text style={styles.meta}>Оплачен: {new Date(item.paidAt).toLocaleDateString("ru-RU")}</Text>
                  <Text style={styles.meta}>Событие: {new Date(item.order.eventDate).toLocaleDateString("ru-RU")}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.amount, { color }]}>
                    {item.type === "refund" ? "−" : ""}{fmt(item.amount)} ₽
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },

  presetsRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    margin: 12,
    marginBottom: 8,
    gap: 4,
  },
  presetBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  presetBtnActive: { backgroundColor: colors.primary },
  presetText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  presetTextActive: { color: "#fff" },

  customPeriod: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  sumBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 6,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  sumLabel: { fontSize: 14, color: colors.textMuted },
  sumValue: { fontSize: 16, fontWeight: "700", color: colors.text },

  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowTop: { flexDirection: "row", gap: 8 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  methodLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  orderTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  clientName: { fontSize: 13, color: colors.primary, marginTop: 4, fontWeight: "600" },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  amount: { fontSize: 18, fontWeight: "800" },
});
