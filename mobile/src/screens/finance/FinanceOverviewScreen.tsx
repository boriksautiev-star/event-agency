import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../api/client";
import { colors } from "../../theme/colors";
import { DatePickerField } from "../../components/DatePickerField";
import { downloadAndShareExcel } from "../../utils/exportCsv";

type Summary = {
  period: { from: string; to: string };
  revenue: number;
  payouts: number;
  transportAgency: number;
  transportClient: number;
  otherExpenses: number;
  profit: number;
  ordersCount: number;
  animatorsCount: number;
  workHours: number;
  income: {
    total: number;
    prepayments: number;
    finals: number;
    refunds: number;
    byMethod: { transfer: number; cash: number };
  };
  cashProfit: number;
};

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

type Preset = "this_month" | "last_month" | "this_year" | "custom";

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

export function FinanceOverviewScreen() {
  const [preset, setPreset] = useState<Preset>("this_month");
  const [customFrom, setCustomFrom] = useState(todayISO().slice(0, 8) + "01");
  const [customTo, setCustomTo] = useState(todayISO());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const currentPeriod = () => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return getPreset(preset);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = currentPeriod();
      const { data } = await api.get<Summary>(`/api/finance/summary?from=${from}&to=${to}`);
      setSummary(data);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить сводку");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const exportCSV = async (kind: "orders" | "payouts" | "expenses") => {
    const { from, to } = currentPeriod();
    setExporting(kind);
    try {
      const path = `/api/finance/export/${kind}?from=${from}&to=${to}`;
      const filename = `${kind}_${from}_${to}.xlsx`;
      await downloadAndShareExcel(path, filename);
    } finally {
      setExporting(null);
    }
  };

  const periodLabel = () => {
    if (preset === "this_month") return "Текущий месяц";
    if (preset === "last_month") return "Прошлый месяц";
    if (preset === "this_year") return "Текущий год";
    return "Свой период";
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
          <Text style={styles.section}>Свой период</Text>
          <DatePickerField value={customFrom} onChange={setCustomFrom} label="От" />
          <DatePickerField value={customTo} onChange={setCustomTo} label="До" />
        </View>
      ) : null}

      {summary ? (
        <>
          <View style={styles.card}>
            <Text style={styles.section}>{periodLabel()}</Text>
            <Text style={styles.period}>
              {summary.period.from} → {summary.period.to}
            </Text>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Выручка</Text>
              <Text style={[styles.totalValue, { color: colors.success }]}>
                {fmt(summary.revenue)} ₽
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Выплаты аниматорам</Text>
              <Text style={styles.totalValue}>−{fmt(summary.payouts)} ₽</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Транспорт (агентство)</Text>
              <Text style={styles.totalValue}>−{fmt(summary.transportAgency)} ₽</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Прочие расходы</Text>
              <Text style={styles.totalValue}>−{fmt(summary.otherExpenses)} ₽</Text>
            </View>

            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandLabel}>Прибыль</Text>
              <Text
                style={[
                  styles.grandValue,
                  { color: summary.profit >= 0 ? colors.primary : colors.danger },
                ]}
              >
                {fmt(summary.profit)} ₽
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Поступления</Text>
            <View style={styles.incomeTotalRow}>
              <Text style={styles.incomeTotalValue}>{fmt(summary.income.total)} ₽</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Предоплаты</Text>
              <Text style={styles.totalValue}>{fmt(summary.income.prepayments)} ₽</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Финал</Text>
              <Text style={styles.totalValue}>{fmt(summary.income.finals)} ₽</Text>
            </View>
            {summary.income.refunds > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Возвраты</Text>
                <Text style={[styles.totalValue, { color: colors.danger }]}>−{fmt(summary.income.refunds)} ₽</Text>
              </View>
            ) : null}
            <Text style={styles.hint}>
              переводом {fmt(summary.income.byMethod.transfer)} ₽ · наличными {fmt(summary.income.byMethod.cash)} ₽
            </Text>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandLabel}>Кассовая прибыль</Text>
              <Text
                style={[
                  styles.grandValue,
                  { color: summary.cashProfit >= 0 ? colors.success : colors.danger },
                ]}
              >
                {fmt(summary.cashProfit)} ₽
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Показатели</Text>
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{summary.ordersCount}</Text>
                <Text style={styles.metricLabel}>Заказов</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{summary.animatorsCount}</Text>
                <Text style={styles.metricLabel}>Аниматоров</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{summary.workHours}</Text>
                <Text style={styles.metricLabel}>Часов</Text>
              </View>
            </View>
          </View>

          {/* ЭКСПОРТ */}
          <View style={styles.card}>
            <Text style={styles.section}>Экспорт CSV</Text>
            <Text style={styles.hint}>
              Файл откроется в системном меню: сохранить, отправить в Telegram / почту / Google Drive.
            </Text>

            <TouchableOpacity
              style={[styles.exportBtn, exporting === "orders" && { opacity: 0.6 }]}
              onPress={() => exportCSV("orders")}
              disabled={!!exporting}
            >
              {exporting === "orders" ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.exportBtnText}>📄 Заказы</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, exporting === "payouts" && { opacity: 0.6 }]}
              onPress={() => exportCSV("payouts")}
              disabled={!!exporting}
            >
              {exporting === "payouts" ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.exportBtnText}>💸 Выплаты</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, exporting === "expenses" && { opacity: 0.6 }]}
              onPress={() => exportCSV("expenses")}
              disabled={!!exporting}
            >
              {exporting === "expenses" ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.exportBtnText}>🧾 Расходы</Text>
              )}
            </TouchableOpacity>
          </View>

          {summary.transportClient > 0 ? (
            <View style={styles.card}>
              <Text style={styles.section}>Транспорт, оплаченный клиентом</Text>
              <Text style={styles.hint}>
                {fmt(summary.transportClient)} ₽ — идёт напрямую аниматорам, в выручку не входит
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  container: { padding: 12, backgroundColor: colors.bg },
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

  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 10 },
  section: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  period: { fontSize: 13, color: colors.textMuted, marginBottom: 14 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  totalLabel: { fontSize: 14, color: colors.textMuted },
  totalValue: { fontSize: 15, fontWeight: "600", color: colors.text },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
    paddingTop: 12,
  },
  grandLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  grandValue: { fontSize: 22, fontWeight: "800" },

  incomeTotalRow: { paddingVertical: 10 },
  incomeTotalValue: { fontSize: 28, fontWeight: "800", color: colors.success },
  metricsRow: { flexDirection: "row", justifyContent: "space-around" },
  metric: { alignItems: "center", flex: 1 },
  metricValue: { fontSize: 24, fontWeight: "700", color: colors.primary },
  metricLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },

  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: 10 },

  exportBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  exportBtnText: { fontSize: 15, fontWeight: "600", color: colors.primary },
});