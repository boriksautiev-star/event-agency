import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { RATE_DURATIONS, formatDuration } from "@event-agency/shared";
import { api } from "../../api/client";
import { colors } from "../../theme/colors";
import type { RateGroup, Character } from "../../api/types";
import {
  assignTemplate,
  fetchOverrides,
  fetchTemplateById,
  fetchTemplates,
  OverrideCell,
  RateTemplateListItem,
  saveOverrides,
} from "../../api/rate-templates";
import type { StaffAnimatorsStackParamList } from "./StaffAnimatorsStack";

type RouteT = RouteProp<StaffAnimatorsStackParamList, "AnimatorRates">;

function ovKey(characterId: string, durationMin: number): string {
  return `${characterId}|${durationMin}`;
}

function tplKey(rateGroupId: string, durationMin: number): string {
  return `${rateGroupId}|${durationMin}`;
}

export function AnimatorRatesScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteT>();
  const { animatorId, animatorName } = route.params;

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<RateTemplateListItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [initialTemplateId, setInitialTemplateId] = useState<string>("");
  const [savingTpl, setSavingTpl] = useState(false);
  const [savingOv, setSavingOv] = useState(false);

  const [groups, setGroups] = useState<RateGroup[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>("");

  const [initialOv, setInitialOv] = useState<Record<string, number>>({});
  const [ovDraft, setOvDraft] = useState<Record<string, string>>({});

  const [tplCellsMap, setTplCellsMap] = useState<Record<string, number>>({});

  const [pickerVisible, setPickerVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tpls, ov, groupsRes, charsRes] = await Promise.all([
        fetchTemplates(),
        fetchOverrides(animatorId),
        api.get<{ items: RateGroup[] }>("/api/rate-groups?includeInactive=false"),
        api.get<{ items: Character[] } | Character[]>("/api/characters?activeOnly=true"),
      ]);

      setTemplates(tpls);
      setSelectedTemplateId(ov.templateId ?? "");
      setInitialTemplateId(ov.templateId ?? "");

      const activeGroups = groupsRes.data.items
        .filter((g) => g.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      setGroups(activeGroups);
      if (activeGroups[0]) setActiveGroupId(activeGroups[0].id);

      const chars = Array.isArray(charsRes.data) ? charsRes.data : charsRes.data.items;
      setCharacters(chars);

      const ini: Record<string, number> = {};
      for (const c of ov.cells) {
        ini[ovKey(c.characterId, c.durationMin)] = c.amount;
      }
      setInitialOv(ini);
      const d: Record<string, string> = {};
      for (const [k, v] of Object.entries(ini)) d[k] = String(v);
      setOvDraft(d);

      if (ov.templateId) {
        const tplDetail = await fetchTemplateById(ov.templateId);
        const tplMap: Record<string, number> = {};
        for (const c of tplDetail.cells) {
          tplMap[tplKey(c.rateGroupId, c.durationMin)] = c.amount;
        }
        setTplCellsMap(tplMap);
      } else {
        setTplCellsMap({});
      }
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, [animatorId]);

  useEffect(() => {
    load();
  }, [load]);

  // Перезагрузка tplCellsMap при смене шаблона
  useEffect(() => {
    if (!selectedTemplateId) {
      setTplCellsMap({});
      return;
    }
    fetchTemplateById(selectedTemplateId)
      .then((d) => {
        const tplMap: Record<string, number> = {};
        for (const c of d.cells) {
          tplMap[tplKey(c.rateGroupId, c.durationMin)] = c.amount;
        }
        setTplCellsMap(tplMap);
      })
      .catch(() => setTplCellsMap({}));
  }, [selectedTemplateId]);

  const templateDirty = selectedTemplateId !== initialTemplateId;

  const onSaveTemplate = async () => {
    setSavingTpl(true);
    try {
      const res = await assignTemplate(
        animatorId,
        selectedTemplateId === "" ? null : selectedTemplateId,
      );
      setInitialTemplateId(selectedTemplateId);
      Alert.alert(
        "Готово",
        `Шаблон сохранён.\nОбновлено будущих назначений: ${res.affectedAssignments}`,
      );
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось сохранить");
    } finally {
      setSavingTpl(false);
    }
  };

  const ovHasChanges = useMemo(() => {
    const keys = new Set([
      ...Object.keys(initialOv),
      ...Object.keys(ovDraft).filter((k) => ovDraft[k] !== ""),
    ]);
    for (const k of keys) {
      const before = initialOv[k];
      const raw = ovDraft[k] ?? "";
      const after = raw === "" ? undefined : Number(raw.replace(",", "."));
      if ((before ?? undefined) !== (after ?? undefined)) return true;
    }
    return false;
  }, [initialOv, ovDraft]);

  const onSaveOverrides = async () => {
    const cells: OverrideCell[] = [];
    for (const [k, raw] of Object.entries(ovDraft)) {
      if (raw === "") continue;
      const [characterId, durStr] = k.split("|");
      const n = Number(raw.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        Alert.alert("Ошибка", `Некорректное значение: ${raw}`);
        return;
      }
      cells.push({ characterId, durationMin: Number(durStr), amount: n });
    }
    setSavingOv(true);
    try {
      const res = await saveOverrides(animatorId, cells);
      Alert.alert(
        "Готово",
        `Переопределения сохранены.\nОбновлено будущих назначений: ${res.affectedAssignments}`,
      );
      await load();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось сохранить");
    } finally {
      setSavingOv(false);
    }
  };

  const charsOfActiveGroup = useMemo(() => {
    if (!activeGroupId) return [];
    return characters.filter((c) => c.rateGroupId === activeGroupId);
  }, [characters, activeGroupId]);

  const currentTemplateName = useMemo(() => {
    if (!initialTemplateId) return "Без шаблона";
    const t = templates.find((x) => x.id === initialTemplateId);
    return t?.name ?? "—";
  }, [templates, initialTemplateId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===== Шаблон ===== */}
        <View style={styles.card}>
          <Text style={styles.section}>Шаблон ставок</Text>
          <TouchableOpacity
            style={styles.templatePicker}
            onPress={() => setPickerVisible(true)}
          >
            <Text style={styles.templatePickerText}>
              {selectedTemplateId
                ? templates.find((x) => x.id === selectedTemplateId)?.name ?? "—"
                : "— Без шаблона —"}
            </Text>
            <Text style={styles.templatePickerChevron}>▾</Text>
          </TouchableOpacity>
          {templateDirty ? (
            <TouchableOpacity
              style={[styles.primaryBtn, savingTpl && { opacity: 0.6 }]}
              onPress={onSaveTemplate}
              disabled={savingTpl}
            >
              {savingTpl ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Сохранить шаблон</Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={styles.hint}>Текущий: {currentTemplateName}</Text>
          )}
        </View>

        {/* ===== Override ===== */}
        <View style={styles.card}>
          <Text style={styles.section}>Переопределения</Text>
          <Text style={styles.hint}>
            Точечная замена ставки для конкретного персонажа. Если пусто — берётся из
            шаблона.
          </Text>

          {!initialTemplateId ? (
            <View style={styles.emptyBox}>
              <Text style={styles.muted}>
                Сначала назначьте шаблон — без него переопределения не применяются.
              </Text>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.muted}>Нет активных групп персонажей</Text>
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 8, marginBottom: 12 }}
                contentContainerStyle={{ gap: 6 }}
              >
                {groups.map((g) => {
                  const active = g.id === activeGroupId;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setActiveGroupId(g.id)}
                    >
                      <Text
                        style={[styles.chipText, active && styles.chipTextActive]}
                      >
                        {g.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {charsOfActiveGroup.length === 0 ? (
                <Text style={styles.muted}>В этой группе нет персонажей</Text>
              ) : (
                charsOfActiveGroup.map((c) => (
                  <View key={c.id} style={styles.charBlock}>
                    <Text style={styles.charName}>{c.name}</Text>
                    {RATE_DURATIONS.map((d) => {
                      const k = ovKey(c.id, d);
                      const base = tplCellsMap[tplKey(activeGroupId, d)];
                      return (
                        <View key={d} style={styles.row}>
                          <Text style={styles.rowLabel}>{formatDuration(d)}</Text>
                          <TextInput
                            style={[styles.rowInput, { flex: 1 }]}
                            value={ovDraft[k] ?? ""}
                            onChangeText={(v) =>
                              setOvDraft((prev) => ({ ...prev, [k]: v }))
                            }
                            keyboardType="numeric"
                            placeholder={base !== undefined ? String(base) : "—"}
                            placeholderTextColor={colors.textMuted}
                          />
                        </View>
                      );
                    })}
                  </View>
                ))
              )}

              {ovHasChanges ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, savingOv && { opacity: 0.6 }]}
                  onPress={onSaveOverrides}
                  disabled={savingOv}
                >
                  {savingOv ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      Сохранить переопределения
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===== Modal picker шаблона ===== */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.overlay}>
          <View
            style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выбор шаблона</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.tplOption, !selectedTemplateId && styles.tplOptionActive]}
              onPress={() => {
                setSelectedTemplateId("");
                setPickerVisible(false);
              }}
            >
              <Text style={styles.tplOptionText}>— Без шаблона —</Text>
              {!selectedTemplateId ? (
                <Text style={styles.tplOptionCheck}>✓</Text>
              ) : null}
            </TouchableOpacity>

            <FlatList
              data={templates.filter((t) => t.isActive)}
              keyExtractor={(x) => x.id}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const active = item.id === selectedTemplateId;
                return (
                  <TouchableOpacity
                    style={[styles.tplOption, active && styles.tplOptionActive]}
                    onPress={() => {
                      setSelectedTemplateId(item.id);
                      setPickerVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tplOptionText}>{item.name}</Text>
                      <Text style={styles.tplOptionMeta}>
                        Ставок: {item.ratesCount} · Аниматоров: {item.animatorsCount}
                      </Text>
                    </View>
                    {active ? <Text style={styles.tplOptionCheck}>✓</Text> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.muted, { padding: 16, textAlign: "center" }]}>
                  Нет активных шаблонов
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
  container: { padding: 12 },
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
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  templatePicker: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  templatePickerText: { flex: 1, fontSize: 15, color: colors.text },
  templatePickerChevron: { fontSize: 14, color: colors.textMuted },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  emptyBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  charBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  charName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    gap: 10,
  },
  rowLabel: { fontSize: 12, color: colors.textMuted, width: 60 },
  baseHint: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "right",
  },
  rowInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.text,
    backgroundColor: "#fff",
    textAlign: "right",
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  close: { fontSize: 20, color: colors.textMuted, padding: 4 },
  tplOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  tplOptionActive: {
    borderColor: colors.primary,
    backgroundColor: "#eef2ff",
  },
  tplOptionText: { fontSize: 14, fontWeight: "600", color: colors.text },
  tplOptionMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  tplOptionCheck: { fontSize: 18, color: colors.primary, fontWeight: "700" },
});
