import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDuration } from "@event-agency/shared";
import { api } from "../../api/client";
import type { Character, CharacterPriceOption } from "../../api/types";
import { colors } from "../../theme/colors";

export type PickedSlot = {
  characterId: string;
  characterName: string;
  rateGroupName: string;
  rateDurationMinutes: number;
  clientPrice: number;
  isCustomPrice: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (slot: PickedSlot) => void;
  initialCharacterId?: string | null;
  initialDurationMin?: number | null;
  title?: string;
};

type Selection = {
  durationMin: number;
  price: number;
  isCustom: boolean;
};

export function OrderSlotModal({
  visible,
  onClose,
  onPick,
  initialCharacterId = null,
  initialDurationMin = null,
  title = "Персонаж и длительность",
}: Props) {
  const insets = useSafeAreaInsets();
  const [kbVisible, setKbVisible] = useState(false);

  React.useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKbVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKbVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [search, setSearch] = useState("");

  const [characterId, setCharacterId] = useState<string | null>(initialCharacterId);
  const [selection, setSelection] = useState<Selection | null>(null);

  // Кастомный режим
  const [customMode, setCustomMode] = useState(false);
  const [customDuration, setCustomDuration] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  // Перезагрузка при каждом открытии
  useEffect(() => {
    if (!visible) return;
    setSearch("");
    setCharacterId(initialCharacterId);
    setSelection(null);
    setCustomMode(false);
    setCustomDuration("");
    setCustomPrice("");
    setLoading(true);
    (async () => {
      try {
        const { data } = await api.get<{ items: Character[] }>(
          "/api/characters?activeOnly=true",
        );
        setCharacters(data.items);
        setLoadedOnce(true);
      } catch (e: any) {
        Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить персонажей");
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, initialCharacterId, initialDurationMin]);

  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === characterId) ?? null,
    [characters, characterId],
  );

  const filteredCharacters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return characters;
    return characters.filter((c) => c.name.toLowerCase().includes(q));
  }, [characters, search]);

  const priceOptions: CharacterPriceOption[] = useMemo(
    () =>
      (selectedCharacter?.priceOptions ?? [])
        .filter((p) => p.isActive)
        .slice()
        .sort((a, b) => a.durationMin - b.durationMin),
    [selectedCharacter],
  );

  const pickPriceOption = (opt: CharacterPriceOption) => {
    setCustomMode(false);
    setSelection({
      durationMin: opt.durationMin,
      price: Number(opt.price),
      isCustom: false,
    });
  };

  const applyCustom = () => {
    Keyboard.dismiss();
    const dur = Number(customDuration.replace(",", "."));
    const prc = Number(customPrice.replace(",", "."));
    if (!Number.isFinite(dur) || dur < 1 || dur > 24 * 60) {
      Alert.alert("Проверьте", "Длительность — целое число минут (от 1 до 1440)");
      return;
    }
    if (!Number.isFinite(prc) || prc < 0) {
      Alert.alert("Проверьте", "Цена должна быть неотрицательным числом");
      return;
    }
    setSelection({
      durationMin: Math.round(dur),
      price: prc,
      isCustom: true,
    });
    setCustomMode(false);
  };

  const submit = () => {
    if (!selectedCharacter || !selection) {
      Alert.alert("Проверьте", "Выберите персонажа и длительность");
      return;
    }
    onPick({
      characterId: selectedCharacter.id,
      characterName: selectedCharacter.name,
      rateGroupName: selectedCharacter.rateGroup?.name ?? "",
      rateDurationMinutes: selection.durationMin,
      clientPrice: selection.price,
      isCustomPrice: selection.isCustom,
    });
    onClose();
  };

  const resetCharacter = () => {
    setCharacterId(null);
    setSelection(null);
    setCustomMode(false);
    setCustomDuration("");
    setCustomPrice("");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <View style={[styles.content, { paddingBottom: kbVisible ? 8 : insets.bottom + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {!selectedCharacter ? (
            // === ШАГ 1: выбор персонажа ===
            <View style={{ maxHeight: 500 }}>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Поиск персонажа"
                autoCorrect={false}
              />
              {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
              ) : !loadedOnce ? null : filteredCharacters.length === 0 ? (
                <Text style={[styles.hint, { textAlign: "center", marginTop: 20 }]}>
                  Ничего не найдено
                </Text>
              ) : (
                <FlatList
                  data={filteredCharacters}
                  keyExtractor={(x) => x.id}
                  style={{ marginTop: 8, maxHeight: 400 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.row}
                      onPress={() => setCharacterId(item.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName}>{item.name}</Text>
                        <Text style={styles.rowMeta}>
                          {item.rateGroup?.name ?? ""}
                          {item.priceOptions && item.priceOptions.length > 0
                            ? ` · ${item.priceOptions.length} цен`
                            : " · нет цен"}
                        </Text>
                      </View>
                      <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          ) : (
            // === ШАГ 2: длительность + цена ===
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View style={styles.selectedBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedName}>{selectedCharacter.name}</Text>
                  <Text style={styles.selectedMeta}>
                    {selectedCharacter.rateGroup?.name ?? ""}
                  </Text>
                </View>
                <TouchableOpacity onPress={resetCharacter}>
                  <Text style={styles.clearText}>Сменить</Text>
                </TouchableOpacity>
              </View>

              {!customMode ? (
                <>
                  <Text style={styles.label}>Выберите длительность</Text>
                  {priceOptions.length === 0 ? (
                    <Text style={styles.hint}>
                      У этого персонажа нет заданных цен. Нажмите «Другая длительность», чтобы ввести вручную.
                    </Text>
                  ) : (
                    priceOptions.map((opt) => {
                      const active =
                        selection &&
                        !selection.isCustom &&
                        selection.durationMin === opt.durationMin;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.priceOption, active && styles.priceOptionActive]}
                          onPress={() => pickPriceOption(opt)}
                        >
                          <Text
                            style={[
                              styles.priceOptionDuration,
                              active && styles.priceOptionTextActive,
                            ]}
                          >
                            {formatDuration(opt.durationMin)}
                          </Text>
                          <Text
                            style={[
                              styles.priceOptionPrice,
                              active && styles.priceOptionTextActive,
                            ]}
                          >
                            {Number(opt.price).toLocaleString("ru-RU")} ₽
                          </Text>
                          {active ? <Text style={styles.check}>✓</Text> : null}
                        </TouchableOpacity>
                      );
                    })
                  )}

                  <TouchableOpacity
                    style={styles.customBtn}
                    onPress={() => {
                      setCustomMode(true);
                      setCustomDuration(
                        selection?.isCustom ? String(selection.durationMin) : "",
                      );
                      setCustomPrice(
                        selection?.isCustom ? String(selection.price) : "",
                      );
                    }}
                  >
                    <Text style={styles.customBtnText}>+ Другая длительность</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Другая длительность</Text>
                  <View style={styles.customRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={customDuration}
                      onChangeText={setCustomDuration}
                      keyboardType="numeric"
                      placeholder="Минут"
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={customPrice}
                      onChangeText={setCustomPrice}
                      keyboardType="numeric"
                      placeholder="Цена, ₽"
                    />
                  </View>
                  <View style={styles.customActions}>
                    <TouchableOpacity
                      style={[styles.secondaryBtn, { flex: 1 }]}
                      onPress={() => setCustomMode(false)}
                    >
                      <Text style={styles.secondaryBtnText}>Отмена</Text>
                    </TouchableOpacity>
                    <View style={{ width: 8 }} />
                    <TouchableOpacity
                      style={[styles.primaryBtn, { flex: 1 }]}
                      onPress={applyCustom}
                    >
                      <Text style={styles.primaryBtnText}>Применить</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {selection ? (
                <View style={styles.summary}>
                  <Text style={styles.summaryLabel}>Итого:</Text>
                  <Text style={styles.summaryValue}>
                    {formatDuration(selection.durationMin)} ·{" "}
                    {selection.price.toLocaleString("ru-RU")} ₽
                    {selection.isCustom ? " (вручную)" : ""}
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          )}

          {selectedCharacter ? (
            <TouchableOpacity
              style={[styles.primaryBtn, !selection && { opacity: 0.5 }]}
              onPress={submit}
              disabled={!selection}
            >
              <Text style={styles.primaryBtnText}>Готово</Text>
            </TouchableOpacity>
          ) : null}
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
    flexShrink: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  close: { fontSize: 20, color: colors.textMuted, padding: 4 },

  hint: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  label: { fontSize: 13, color: colors.textMuted, marginTop: 12, marginBottom: 6 },

  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "#fff",
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  rowName: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  arrow: { fontSize: 20, color: colors.textMuted },

  selectedBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedName: { fontSize: 15, fontWeight: "700", color: colors.text },
  selectedMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  clearText: { fontSize: 13, color: colors.primary, fontWeight: "600" },

  priceOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    marginTop: 8,
  },
  priceOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  priceOptionDuration: { fontSize: 15, fontWeight: "600", color: colors.text, width: 90 },
  priceOptionPrice: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text, textAlign: "right" },
  priceOptionTextActive: { color: "#fff" },
  check: { fontSize: 16, color: "#fff", fontWeight: "700", marginLeft: 8 },

  customBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
    alignItems: "center",
  },
  customBtnText: { color: colors.primary, fontSize: 13, fontWeight: "600" },

  customRow: { flexDirection: "row", gap: 8 },
  customActions: { flexDirection: "row", marginTop: 12 },
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

  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.bg,
    borderRadius: 10,
  },
  summaryLabel: { fontSize: 13, color: colors.textMuted },
  summaryValue: { fontSize: 15, fontWeight: "700", color: colors.text },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: colors.primary, fontWeight: "600", fontSize: 15 },
});