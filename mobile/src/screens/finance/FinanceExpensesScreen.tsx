import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../api/client";
import { colors } from "../../theme/colors";
import { DatePickerField } from "../../components/DatePickerField";
import { downloadAndShareExcel } from "../../utils/exportCsv";

type ExpenseCategory = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

type Expense = {
  id: string;
  categoryId: string;
  category: { id: string; name: string };
  orderId: string | null;
  order: { id: string; title: string } | null;
  amount: number;
  expenseDate: string;
  comment: string | null;
};

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function FinanceExpensesScreen() {
  const insets = useSafeAreaInsets();
  const [kbVisible, setKbVisible] = React.useState(false);
  React.useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKbVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKbVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const [items, setItems] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [sum, setSum] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [usePeriod, setUsePeriod] = useState(false);
  const [filtersModal, setFiltersModal] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(todayISO());
  const [newComment, setNewComment] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (usePeriod && from && to) {
        params.set("from", from);
        params.set("to", to);
      }
      params.set("limit", "500");

      const [expRes, catRes] = await Promise.all([
        api.get<{ items: Expense[]; sum: number }>(`/api/finance/expenses?${params.toString()}`),
        api.get<{ items: ExpenseCategory[] }>("/api/finance/expense-categories"),
      ]);
      setItems(expRes.data.items);
      setSum(expRes.data.sum);
      setCategories(catRes.data.items.filter((c) => c.isActive));
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить расходы");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryFilter, usePeriod, from, to]);

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
    setCategoryFilter(null);
    setUsePeriod(false);
    setFrom("");
    setTo("");
  };

  const activeFilters = (categoryFilter ? 1 : 0) + (usePeriod && from && to ? 1 : 0);

  const openCreate = () => {
    setNewCategoryId(categories[0]?.id ?? "");
    setNewAmount("");
    setNewDate(todayISO());
    setNewComment("");
    setCreateModal(true);
  };

  const submitCreate = async () => {
    const amountNum = Number(newAmount.replace(",", "."));
    if (!newCategoryId) {
      Alert.alert("Выберите категорию");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      Alert.alert("Введите сумму больше 0");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/finance/expenses", {
        categoryId: newCategoryId,
        amount: amountNum,
        expenseDate: newDate,
        comment: newComment.trim() || null,
      });
      setCreateModal(false);
      await load();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось создать");
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) => {
    Alert.alert("Удалить расход?", "Действие необратимо", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/api/finance/expenses/${id}`);
            await load();
          } catch (e: any) {
            Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось удалить");
          }
        },
      },
    ]);
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (usePeriod && from && to) {
        params.set("from", from);
        params.set("to", to);
      }
      const fromD = (usePeriod && from) || "2020-01-01";
      const toD = (usePeriod && to) || new Date().toISOString().slice(0, 10);
      const path = `/api/finance/export/expenses?${params.toString()}`;
      await downloadAndShareExcel(path, `expenses_${fromD}_${toD}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const currentCategoryName = () => {
    if (!categoryFilter) return null;
    return categories.find((c) => c.id === categoryFilter)?.name ?? null;
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
      <View style={styles.sumBar}>
        <View>
          <Text style={styles.sumLabel}>Всего расходов</Text>
          <Text style={styles.sumValue}>{fmt(sum)} ₽</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={[styles.filtersBtn, activeFilters > 0 && styles.filtersBtnActive]}
            onPress={() => setFiltersModal(true)}
          >
            <Text style={[styles.filtersBtnText, activeFilters > 0 && styles.filtersBtnTextActive]}>
              Фильтры{activeFilters > 0 ? ` (${activeFilters})` : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filtersBtn}
            onPress={exportCSV}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.filtersBtnText}>Excel</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeFilters > 0 ? (
        <View style={styles.activeInfo}>
          {categoryFilter ? (
            <Text style={styles.activeInfoText}>Категория: {currentCategoryName()}</Text>
          ) : null}
          {usePeriod && from && to ? (
            <Text style={styles.activeInfoText}>Период: {from} → {to}</Text>
          ) : null}
          <TouchableOpacity onPress={resetFilters} style={styles.resetInline}>
            <Text style={styles.resetInlineText}>Сбросить</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.muted}>Пока расходов нет</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.catName}>{item.category.name}</Text>
                <Text style={styles.meta}>
                  {new Date(item.expenseDate).toLocaleDateString("ru-RU")}
                  {item.order ? ` · ${item.order.title}` : ""}
                </Text>
                {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
              </View>
              <Text style={styles.amount}>{fmt(item.amount)} ₽</Text>
              <TouchableOpacity onPress={() => remove(item.id)} style={styles.removeBtn}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal
        visible={filtersModal}
        animationType="slide"
        transparent
        onRequestClose={() => setFiltersModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
        >
          <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: kbVisible ? 8 : insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Фильтры</Text>
              <TouchableOpacity onPress={() => setFiltersModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Категория</Text>
              <View style={styles.chips}>
                <TouchableOpacity
                  style={[styles.chip, !categoryFilter && styles.chipActive]}
                  onPress={() => setCategoryFilter(null)}
                >
                  <Text style={[styles.chipText, !categoryFilter && styles.chipTextActive]}>
                    Все
                  </Text>
                </TouchableOpacity>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, categoryFilter === c.id && styles.chipActive]}
                    onPress={() => setCategoryFilter(c.id)}
                  >
                    <Text
                      style={[styles.chipText, categoryFilter === c.id && styles.chipTextActive]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.checkRow}>
                <TouchableOpacity
                  style={styles.checkRowLeft}
                  onPress={() => setUsePeriod((v) => !v)}
                >
                  <View style={[styles.checkbox, usePeriod && styles.checkboxActive]}>
                    {usePeriod ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.checkLabel}>Период</Text>
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
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={createModal}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
        >
          <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: kbVisible ? 8 : insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Новый расход</Text>
              <TouchableOpacity onPress={() => setCreateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Категория</Text>
              <View style={styles.chips}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, newCategoryId === c.id && styles.chipActive]}
                    onPress={() => setNewCategoryId(c.id)}
                  >
                    <Text
                      style={[styles.chipText, newCategoryId === c.id && styles.chipTextActive]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Сумма, ₽</Text>
              <TextInput
                style={styles.input}
                value={newAmount}
                onChangeText={setNewAmount}
                placeholder="5000"
                keyboardType="numeric"
              />

              <DatePickerField value={newDate} onChange={setNewDate} label="Дата" />

              <Text style={styles.label}>Комментарий</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Аренда за сентябрь"
                multiline
              />

              <TouchableOpacity
                style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
                onPress={submitCreate}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Добавить</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },

  sumBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sumLabel: { fontSize: 12, color: colors.textMuted },
  sumValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 22, lineHeight: 24 },

  filtersBtn: {
    paddingHorizontal: 12,
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  filtersBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filtersBtnText: { fontSize: 14, color: colors.text, fontWeight: "700", textAlign: "center" },
  filtersBtnTextActive: { color: "#fff" },

  activeInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.card,
    gap: 2,
  },
  activeInfoText: { fontSize: 12, color: colors.textMuted },
  resetInline: { alignSelf: "flex-start", marginTop: 4 },
  resetInlineText: { fontSize: 12, color: colors.danger, fontWeight: "600" },

  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  catName: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  comment: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: "italic" },
  amount: { fontSize: 15, fontWeight: "700", color: colors.danger },
  removeBtn: { padding: 6 },
  removeText: { fontSize: 16, color: colors.danger },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modalClose: { fontSize: 20, color: colors.textMuted, padding: 4 },
  label: { fontSize: 13, color: colors.textMuted, marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: "#fff",
  },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },

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
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});