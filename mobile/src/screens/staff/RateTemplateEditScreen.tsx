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
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { RATE_DURATIONS, formatDuration } from "@event-agency/shared";
import { api } from "../../api/client";
import { colors } from "../../theme/colors";
import {
  fetchTemplateById,
  saveTemplateRates,
  SaveTemplateCell,
  RateTemplateDetail,
} from "../../api/rate-templates";
import type { RateGroup } from "../../api/types";
import type { StaffAnimatorsStackParamList } from "./StaffAnimatorsStack";

type RouteT = RouteProp<StaffAnimatorsStackParamList, "RateTemplateEdit">;

function cellKey(rateGroupId: string, durationMin: number): string {
  return `${rateGroupId}|${durationMin}`;
}

export function RateTemplateEditScreen() {
  const route = useRoute<RouteT>();
  const { templateId } = route.params;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tpl, setTpl] = useState<RateTemplateDetail | null>(null);
  const [groups, setGroups] = useState<RateGroup[]>([]);
  const [initial, setInitial] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [tplData, groupsRes] = await Promise.all([
        fetchTemplateById(templateId),
        api.get<{ items: RateGroup[] }>("/api/rate-groups?includeInactive=false"),
      ]);
      setTpl(tplData);
      setGroups(
        groupsRes.data.items
          .filter((g) => g.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
      const ini: Record<string, number> = {};
      for (const c of tplData.cells) {
        ini[cellKey(c.rateGroupId, c.durationMin)] = c.amount;
      }
      setInitial(ini);
      const d: Record<string, string> = {};
      for (const [k, v] of Object.entries(ini)) d[k] = String(v);
      setDraft(d);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    load();
  }, [load]);

  const hasChanges = useMemo(() => {
    for (const g of groups) {
      for (const d of RATE_DURATIONS) {
        const k = cellKey(g.id, d);
        const before = initial[k];
        const raw = draft[k] ?? "";
        const after = raw === "" ? undefined : Number(raw.replace(",", "."));
        if ((before ?? undefined) !== (after ?? undefined)) return true;
      }
    }
    return false;
  }, [groups, initial, draft]);

  const onSave = async () => {
    if (!hasChanges) return;
    const cells: SaveTemplateCell[] = [];
    for (const g of groups) {
      for (const d of RATE_DURATIONS) {
        const k = cellKey(g.id, d);
        const before = initial[k];
        const raw = draft[k] ?? "";
        if (raw === "") {
          if (before !== undefined) {
            cells.push({ rateGroupId: g.id, durationMin: d, amount: null });
          }
        } else {
          const n = Number(raw.replace(",", "."));
          if (!Number.isFinite(n) || n < 0) {
            Alert.alert("Ошибка", `Некорректное значение: ${raw}`);
            return;
          }
          cells.push({ rateGroupId: g.id, durationMin: d, amount: n });
        }
      }
    }
    if (cells.length === 0) return;
    setBusy(true);
    try {
      const res = await saveTemplateRates(templateId, cells);
      Alert.alert(
        "Готово",
        `Сохранено.\nОбновлено будущих назначений: ${res.affectedAssignments}`,
      );
      await load();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const onReset = () => {
    if (!hasChanges) return;
    Alert.alert("Отменить изменения?", undefined, [
      { text: "Нет", style: "cancel" },
      {
        text: "Да",
        style: "destructive",
        onPress: () => {
          const d: Record<string, string> = {};
          for (const [k, v] of Object.entries(initial)) d[k] = String(v);
          setDraft(d);
        },
      },
    ]);
  };

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
        {tpl?.notes ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>{tpl.notes}</Text>
          </View>
        ) : null}

        {groups.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.muted}>Нет активных групп персонажей</Text>
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.id} style={styles.card}>
              <Text style={styles.groupTitle}>{g.name}</Text>
              {RATE_DURATIONS.map((d) => {
                const k = cellKey(g.id, d);
                return (
                  <View key={d} style={styles.row}>
                    <Text style={styles.rowLabel}>{formatDuration(d)}</Text>
                    <TextInput
                      style={styles.rowInput}
                      value={draft[k] ?? ""}
                      onChangeText={(v) =>
                        setDraft((prev) => ({ ...prev, [k]: v }))
                      }
                      keyboardType="numeric"
                      placeholder="—"
                    />
                  </View>
                );
              })}
            </View>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.footer}>
        {hasChanges ? (
          <Text style={styles.dirtyHint}>Есть изменения</Text>
        ) : null}
        <TouchableOpacity
          style={[
            styles.footerBtn,
            styles.footerBtnOutline,
            (!hasChanges || busy) && { opacity: 0.5 },
          ]}
          onPress={onReset}
          disabled={!hasChanges || busy}
        >
          <Text style={styles.footerBtnOutlineText}>Отменить</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.footerBtn,
            styles.footerBtnPrimary,
            (!hasChanges || busy) && { opacity: 0.5 },
          ]}
          onPress={onSave}
          disabled={!hasChanges || busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.footerBtnPrimaryText}>Сохранить</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
  container: { padding: 12 },
  infoCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoText: { fontSize: 13, color: "#1e40af" },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 10,
  },
  rowLabel: { fontSize: 13, color: colors.textMuted, width: 60 },
  rowInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "#fff",
    textAlign: "right",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  dirtyHint: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: "600",
    flex: 1,
  },
  footerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  footerBtnOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#f1f5f9",
  },
  footerBtnOutlineText: { color: colors.text, fontWeight: "600", fontSize: 14 },
  footerBtnPrimary: { backgroundColor: colors.primary },
  footerBtnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
