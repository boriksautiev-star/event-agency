import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../api/client";
import type { Character, RateGroup } from "../../api/types";
import { colors } from "../../theme/colors";
import { ORDER_STATUS_LABELS } from "../../utils/labels";
import { DatePickerField } from "../../components/DatePickerField";

export type OrdersFilter = {
  status: string;
  dateFrom: string;
  dateTo: string;
  rateGroupId: string;
  characterId: string;
  priceFrom: string;
  priceTo: string;
  hasAnimators: "all" | "true" | "false";
  prepaymentPaid: "all" | "true" | "false";
};

export const EMPTY_FILTER: OrdersFilter = {
  status: "",
  dateFrom: "",
  dateTo: "",
  rateGroupId: "",
  characterId: "",
  priceFrom: "",
  priceTo: "",
  hasAnimators: "all",
  prepaymentPaid: "all",
};

export function countActiveFilters(f: OrdersFilter): number {
  let n = 0;
  if (f.status) n++;
  if (f.dateFrom || f.dateTo) n++;
  if (f.rateGroupId) n++;
  if (f.characterId) n++;
  if (f.priceFrom || f.priceTo) n++;
  if (f.hasAnimators !== "all") n++;
  if (f.prepaymentPaid !== "all") n++;
  return n;
}

type Props = {
  visible: boolean;
  value: OrdersFilter;
  onClose: () => void;
  onApply: (f: OrdersFilter) => void;
};

const STATUSES: { value: string; label: string }[] = [
  { value: "", label: "Все" },
  { value: "new", label: ORDER_STATUS_LABELS.new },
  { value: "confirmed", label: ORDER_STATUS_LABELS.confirmed },
  { value: "in_progress", label: ORDER_STATUS_LABELS.in_progress },
  { value: "completed", label: ORDER_STATUS_LABELS.completed },
  { value: "cancelled", label: ORDER_STATUS_LABELS.cancelled },
];

export function OrdersFilterModal({ visible, value, onClose, onApply }: Props) {
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
  const [f, setF] = useState<OrdersFilter>(value);
  const [groups, setGroups] = useState<RateGroup[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);

  useEffect(() => {
    if (visible) setF(value);
  }, [visible, value]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const [grRes, chRes] = await Promise.all([
          api.get<{ items: RateGroup[] }>("/api/rate-groups"),
          api.get<{ items: Character[] }>("/api/characters"),
        ]);
        setGroups(grRes.data.items.filter((g) => g.isActive));
        setCharacters(chRes.data.items.filter((c) => c.isActive));
      } catch {
        // ignore
      }
    })();
  }, [visible]);

  const reset = () => setF(EMPTY_FILTER);
  const apply = () => {
    onApply(f);
    onClose();
  };

  const set = <K extends keyof OrdersFilter>(key: K, v: OrdersFilter[K]) =>
    setF((prev) => ({ ...prev, [key]: v }));

  const filteredCharacters = f.rateGroupId
    ? characters.filter((c) => c.rateGroupId === f.rateGroupId)
    : [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.overlay}>
          <View style={[styles.content, { paddingBottom: kbVisible ? 8 : insets.bottom + 16 }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={reset}>
                <Text style={styles.reset}>Сбросить</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Фильтры</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: "75%" }} keyboardShouldPersistTaps="handled">
              <Text style={styles.section}>Статус</Text>
              <View style={styles.chips}>
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s.value || "all"}
                    style={[styles.chip, f.status === s.value && styles.chipActive]}
                    onPress={() => set("status", s.value)}
                  >
                    <Text style={[styles.chipText, f.status === s.value && styles.chipTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.section}>Дата заказа</Text>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={styles.dateLabelRow}>
                    <Text style={styles.label}>От</Text>
                    {f.dateFrom ? (
                      <TouchableOpacity onPress={() => set("dateFrom", "")}>
                        <Text style={styles.clearBtn}>✕</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <DatePickerField
                    value={f.dateFrom || new Date().toISOString().slice(0, 10)}
                    onChange={(v) => set("dateFrom", v)}
                    label=""
                  />
                  {!f.dateFrom ? <Text style={styles.hintSmall}>Не выбрано</Text> : null}
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <View style={styles.dateLabelRow}>
                    <Text style={styles.label}>До</Text>
                    {f.dateTo ? (
                      <TouchableOpacity onPress={() => set("dateTo", "")}>
                        <Text style={styles.clearBtn}>✕</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <DatePickerField
                    value={f.dateTo || new Date().toISOString().slice(0, 10)}
                    onChange={(v) => set("dateTo", v)}
                    label=""
                  />
                  {!f.dateTo ? <Text style={styles.hintSmall}>Не выбрано</Text> : null}
                </View>
              </View>

              <Text style={styles.section}>Группа персонажей</Text>
              <View style={styles.chips}>
                <TouchableOpacity
                  style={[styles.chip, !f.rateGroupId && styles.chipActive]}
                  onPress={() => {
                    set("rateGroupId", "");
                    set("characterId", "");
                  }}
                >
                  <Text style={[styles.chipText, !f.rateGroupId && styles.chipTextActive]}>Все</Text>
                </TouchableOpacity>
                {groups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.chip, f.rateGroupId === g.id && styles.chipActive]}
                    onPress={() => {
                      set("rateGroupId", g.id);
                      set("characterId", "");
                    }}
                  >
                    <Text style={[styles.chipText, f.rateGroupId === g.id && styles.chipTextActive]}>
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {filteredCharacters.length > 0 ? (
                <>
                  <Text style={styles.section}>Конкретный персонаж</Text>
                  <View style={styles.chips}>
                    <TouchableOpacity
                      style={[styles.chip, !f.characterId && styles.chipActive]}
                      onPress={() => set("characterId", "")}
                    >
                      <Text style={[styles.chipText, !f.characterId && styles.chipTextActive]}>Все</Text>
                    </TouchableOpacity>
                    {filteredCharacters.map((ch) => (
                      <TouchableOpacity
                        key={ch.id}
                        style={[styles.chip, f.characterId === ch.id && styles.chipActive]}
                        onPress={() => set("characterId", ch.id)}
                      >
                        <Text style={[styles.chipText, f.characterId === ch.id && styles.chipTextActive]}>
                          {ch.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={styles.section}>Стоимость для клиента, ₽</Text>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>От</Text>
                  <TextInput
                    style={styles.input}
                    value={f.priceFrom}
                    onChangeText={(v) => set("priceFrom", v)}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>До</Text>
                  <TextInput
                    style={styles.input}
                    value={f.priceTo}
                    onChangeText={(v) => set("priceTo", v)}
                    placeholder="100000"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.section}>Аниматоры</Text>
              <View style={styles.chips}>
                {[
                  { v: "all", l: "Все" },
                  { v: "true", l: "С аниматорами" },
                  { v: "false", l: "Без аниматоров" },
                ].map((x) => (
                  <TouchableOpacity
                    key={x.v}
                    style={[styles.chip, f.hasAnimators === x.v && styles.chipActive]}
                    onPress={() => set("hasAnimators", x.v as OrdersFilter["hasAnimators"])}
                  >
                    <Text style={[styles.chipText, f.hasAnimators === x.v && styles.chipTextActive]}>
                      {x.l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.section}>Предоплата</Text>
              <View style={styles.chips}>
                {[
                  { v: "all", l: "Все" },
                  { v: "true", l: "Получена" },
                  { v: "false", l: "Не получена" },
                ].map((x) => (
                  <TouchableOpacity
                    key={x.v}
                    style={[styles.chip, f.prepaymentPaid === x.v && styles.chipActive]}
                    onPress={() => set("prepaymentPaid", x.v as OrdersFilter["prepaymentPaid"])}
                  >
                    <Text style={[styles.chipText, f.prepaymentPaid === x.v && styles.chipTextActive]}>
                      {x.l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <TouchableOpacity style={styles.applyBtn} onPress={apply}>
              <Text style={styles.applyText}>Применить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  reset: { color: colors.danger, fontWeight: "600", fontSize: 14 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  close: { fontSize: 20, color: colors.textMuted, padding: 4 },
  section: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 6,
  },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  dateLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  clearBtn: { fontSize: 14, color: colors.danger, fontWeight: "700", paddingHorizontal: 4 },
  hintSmall: { fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: "center" },
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
  row: { flexDirection: "row" },
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
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  applyText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});