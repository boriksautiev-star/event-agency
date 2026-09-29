import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../api/client";
import { colors } from "../../theme/colors";
import { DatePickerField } from "../../components/DatePickerField";
import { downloadAndShareExcel } from "../../utils/exportCsv";

type PayoutItem = {
  id: string;
  animatorId: string;
  animator: { id: string; firstName: string; lastName: string; phone: string };
  orderId: string;
  order: { id: string; title: string; eventDate: string; startTime: string; endTime: string; status: string };
  payout: number;
  transportCost: number;
  transportClientAmount: number;
  payoutPaidAt: string | null;
  payoutPaidBy: string | null;
  payoutMethod: "cash" | "transfer" | null;
  status: string;
};

type AnimatorLite = {
  id: string;
  firstName: string;
  lastName: string;
};

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

type Filter = "false" | "true" | "all";

export function FinancePayoutsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("false");
  const [animatorId, setAnimatorId] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [usePeriod, setUsePeriod] = useState(false);

  const [animators, setAnimators] = useState<AnimatorLite[]>([]);
  const [animatorModal, setAnimatorModal] = useState(false);
  const [filtersModal, setFiltersModal] = useState(false);

  const [items, setItems] = useState<PayoutItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<{ items: AnimatorLite[] }>("/api/users?role=animator");
        setAnimators(data.items);
      } catch {
        // ignore
      }
    })();
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("paid", filter);
      if (animatorId) params.set("animatorId", animatorId);
      if (usePeriod && from && to) {
        params.set("from", from);
        params.set("to", to);
      }
      const { data } = await api.get<{ items: PayoutItem[]; total: number }>(
        `/api/finance/payouts?${params.toString()}`,
      );
      setItems(data.items);
      setTotal(data.total);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить выплаты");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, animatorId, usePeriod, from, to]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const resetFilters = () => {
    setAnimatorId(null);
    setUsePeriod(false);
    setFrom("");
    setTo("");
  };

  const activeExtraFilters = (animatorId ? 1 : 0) + (usePeriod && from && to ? 1 : 0);

  const markPaid = (id: string, name: string, amount: number, method: "cash" | "transfer") => {
    const label = method === "cash" ? "наличными" : "переводом";
    Alert.alert(
      "Отметить выплату",
      `${name}\n${fmt(amount)} ₽ — ${label}?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Выплатил",
          onPress: async () => {
            try {
              await api.post(`/api/finance/payouts/${id}/paid`, { method });
              await load();
            } catch (e: any) {
              Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось отметить");
            }
          },
        },
      ],
    );
  };

  const unmarkPaid = (id: string, name: string) => {
    Alert.alert("Отменить выплату", `${name} — снять отметку «выплачено»?`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Снять",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/api/finance/payouts/${id}/paid`);
            await load();
          } catch (e: any) {
            Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось снять");
          }
        },
      },
    ]);
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("paid", filter);
      if (animatorId) params.set("animatorId", animatorId);
      if (usePeriod && from && to) {
        params.set("from", from);
        params.set("to", to);
      }
      const fromD = (usePeriod && from) || "2020-01-01";
      const toD = (usePeriod && to) || new Date().toISOString().slice(0, 10);
      const path = `/api/finance/export/payouts?${params.toString()}`;
      await downloadAndShareExcel(path, `payouts_${fromD}_${toD}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const currentAnimatorName = () => {
    if (!animatorId) return null;
    const a = animators.find((x) => x.id === animatorId);
    return a ? `${a.firstName} ${a.lastName}` : null;
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
      <View style={styles.filters}>
        {([
          { key: "false", label: "К выплате" },
          { key: "true", label: "Выплачено" },
          { key: "all", label: "Все" },
        ] as const).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => {
              setFilter(f.key);
              setLoading(true);
            }}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.extraBar}>
        <TouchableOpacity
          style={[styles.extraBtn, activeExtraFilters > 0 && styles.extraBtnActive]}
          onPress={() => setFiltersModal(true)}
        >
          <Text
            style={[styles.extraBtnText, activeExtraFilters > 0 && styles.extraBtnTextActive]}
          >
            ⚙ Фильтры{activeExtraFilters > 0 ? ` (${activeExtraFilters})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.extraBtn} onPress={exportCSV} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.extraBtnText}>📄 Excel</Text>
          )}
        </TouchableOpacity>

        {activeExtraFilters > 0 ? (
          <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
            <Text style={styles.resetText}>Сбросить</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {animatorId || (usePeriod && from && to) ? (
        <View style={styles.activeInfo}>
          {animatorId ? (
            <Text style={styles.activeInfoText}>Аниматор: {currentAnimatorName()}</Text>
          ) : null}
          {usePeriod && from && to ? (
            <Text style={styles.activeInfoText}>Период: {from} → {to}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.sumBar}>
        <Text style={styles.sumLabel}>Итого:</Text>
        <Text style={styles.sumValue}>{fmt(total)} ₽</Text>
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
          const paid = !!item.payoutPaidAt;
          const methodLabel =
            item.payoutMethod === "cash"
              ? "Наличными"
              : item.payoutMethod === "transfer"
              ? "Переводом"
              : "";
          return (
            <View style={styles.card}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {item.animator.firstName} {item.animator.lastName}
                  </Text>
                  <Text style={styles.meta}>
                    {new Date(item.order.eventDate).toLocaleDateString("ru-RU")} ·{" "}
                    {item.order.startTime}–{item.order.endTime}
                  </Text>
                  <Text style={styles.orderTitle}>{item.order.title}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.amount}>{fmt(item.payout)} ₽</Text>
                  {paid ? (
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

              {item.transportCost > 0 ? (
                <Text style={styles.transport}>
                  Такси: {fmt(item.transportCost)} ₽ (клиент: {fmt(item.transportClientAmount)} ₽)
                </Text>
              ) : null}

              {paid ? (
                <View style={styles.paidInfo}>
                  <Text style={styles.paidInfoText}>
                    ✓ {methodLabel}
                    {item.payoutPaidAt
                      ? ` · ${new Date(item.payoutPaidAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : ""}
                  </Text>
                  <TouchableOpacity onPress={() => unmarkPaid(item.id, `${item.animator.firstName} ${item.animator.lastName}`)}>
                    <Text style={styles.cancelText}>Отменить</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnCash]}
                    onPress={() =>
                      markPaid(
                        item.id,
                        `${item.animator.firstName} ${item.animator.lastName}`,
                        item.payout,
                        "cash",
                      )
                    }
                  >
                    <Text style={styles.actionText}>💵 Наличными</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnTransfer]}
                    onPress={() =>
                      markPaid(
                        item.id,
                        `${item.animator.firstName} ${item.animator.lastName}`,
                        item.payout,
                        "transfer",
                      )
                    }
                  >
                    <Text style={styles.actionText}>💳 Переводом</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      <Modal
        visible={filtersModal}
        animationType="slide"
        transparent
        onRequestClose={() => setFiltersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Фильтры</Text>
              <TouchableOpacity onPress={() => setFiltersModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Аниматор</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setAnimatorModal(true)}
              >
                <Text style={[styles.pickerText, !animatorId && { color: colors.textMuted }]}>
                  {currentAnimatorName() ?? "Все аниматоры"}
                </Text>
              </TouchableOpacity>

              {animatorId ? (
                <TouchableOpacity onPress={() => setAnimatorId(null)}>
                  <Text style={styles.clearSmall}>✕ Очистить</Text>
                </TouchableOpacity>
              ) : null}

              <View style={styles.checkRow}>
                <TouchableOpacity
                  style={styles.checkRowLeft}
                  onPress={() => setUsePeriod((v) => !v)}
                >
                  <View style={[styles.checkbox, usePeriod && styles.checkboxActive]}>
                    {usePeriod ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.checkLabel}>Период заказа</Text>
                </TouchableOpacity>
              </View>

              {usePeriod ? (
                <View style={{ marginTop: 8 }}>
                  <DatePickerField
                    value={from || new Date().toISOString().slice(0, 10)}
                    onChange={setFrom}
                    label="От"
                  />
                  <DatePickerField
                    value={to || new Date().toISOString().slice(0, 10)}
                    onChange={setTo}
                    label="До"
                  />
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  setLoading(true);
                  setFiltersModal(false);
                }}
              >
                <Text style={styles.applyText}>Применить</Text>
              </TouchableOpacity>

              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={animatorModal}
        animationType="slide"
        transparent
        onRequestClose={() => setAnimatorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выбор аниматора</Text>
              <TouchableOpacity onPress={() => setAnimatorModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={[{ id: "", firstName: "Все", lastName: "аниматоры" } as AnimatorLite, ...animators]}
              keyExtractor={(x) => x.id || "all"}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.animatorRow}
                  onPress={() => {
                    setAnimatorId(item.id || null);
                    setAnimatorModal(false);
                  }}
                >
                  <Text style={styles.animatorName}>
                    {item.firstName} {item.lastName}
                  </Text>
                  {animatorId === (item.id || null) ? (
                    <Text style={styles.checkIcon}>✓</Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },

  filters: { flexDirection: "row", backgroundColor: colors.card, padding: 8, gap: 6 },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  filterBtnActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  filterTextActive: { color: "#fff" },

  extraBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  extraBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  extraBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  extraBtnText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  extraBtnTextActive: { color: "#fff" },
  resetBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  resetText: { fontSize: 13, color: colors.danger, fontWeight: "600" },

  activeInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.card,
    gap: 2,
  },
  activeInfoText: { fontSize: 12, color: colors.textMuted },

  sumBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sumLabel: { fontSize: 14, color: colors.textMuted },
  sumValue: { fontSize: 16, fontWeight: "700", color: colors.text },

  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowTop: { flexDirection: "row", gap: 8 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  orderTitle: { fontSize: 13, color: colors.primary, marginTop: 4, fontWeight: "600" },
  amount: { fontSize: 16, fontWeight: "800", color: colors.text },
  badge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  transport: { fontSize: 12, color: colors.textMuted, marginTop: 6 },

  paidInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paidInfoText: { fontSize: 13, color: colors.success, fontWeight: "600" },
  cancelText: { fontSize: 13, color: colors.danger, fontWeight: "600" },

  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnCash: { backgroundColor: "#0ea5e9" },
  actionBtnTransfer: { backgroundColor: colors.primary },
  actionText: { color: "#fff", fontWeight: "600", fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modalClose: { fontSize: 20, color: colors.textMuted, padding: 4 },
  label: { fontSize: 13, color: colors.textMuted, marginTop: 8, marginBottom: 6 },
  pickerBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  pickerText: { fontSize: 15, color: colors.text },
  clearSmall: { fontSize: 12, color: colors.danger, marginTop: 6, fontWeight: "600" },

  checkRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  checkRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  checkLabel: { fontSize: 14, color: colors.text },

  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  applyText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  animatorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  animatorName: { fontSize: 15, color: colors.text },
  checkIcon: { fontSize: 16, color: colors.primary, fontWeight: "700" },
});