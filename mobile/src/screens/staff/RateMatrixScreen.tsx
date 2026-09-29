import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RATE_DURATIONS, formatDuration } from "@event-agency/shared";
import { api } from "../../api/client";
import type { RateGroup, RateMatrix } from "../../api/types";
import { colors } from "../../theme/colors";
import type { StaffAnimatorsStackParamList } from "./StaffAnimatorsStack";

type RouteT = RouteProp<StaffAnimatorsStackParamList, "RateMatrix">;
type Nav = NativeStackNavigationProp<StaffAnimatorsStackParamList, "RateMatrix">;

function cellKey(groupId: string, dur: number) {
  return groupId + ":" + dur;
}

export function RateMatrixScreen() {
  const route = useRoute<RouteT>();
  const navigation = useNavigation<Nav>();
  const { animatorId, animatorName } = route.params;

  const [groups, setGroups] = useState<RateGroup[]>([]);
  const [original, setOriginal] = useState<Record<string, number>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: animatorName });
  }, [navigation, animatorName]);

  const load = useCallback(async () => {
    try {
      const [grRes, mxRes] = await Promise.all([
        api.get<{ items: RateGroup[] }>("/api/rate-groups"),
        api.get<RateMatrix>(`/api/rates/matrix?animatorId=${animatorId}`),
      ]);
      setGroups(grRes.data.items);
      const orig: Record<string, number> = {};
      const ed: Record<string, string> = {};
      for (const c of mxRes.data.cells) {
        const k = cellKey(c.rateGroupId, c.durationMin);
        orig[k] = c.amount;
        ed[k] = String(c.amount);
      }
      setOriginal(orig);
      setEdited(ed);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, [animatorId]);

  useEffect(() => {
    load();
  }, [load]);

  const setCell = (groupId: string, dur: number, v: string) => {
    setEdited((prev) => ({ ...prev, [cellKey(groupId, dur)]: v }));
  };

  const dirtyCells = useMemo(() => {
    const out: Array<{ rateGroupId: string; durationMin: number; amount: number | null }> = [];
    const keys = new Set<string>([...Object.keys(original), ...Object.keys(edited)]);
    for (const k of keys) {
      const [groupId, durStr] = k.split(":");
      const dur = Number(durStr);
      const oldV = original[k];
      const newStr = edited[k];
      const newV =
        newStr === undefined || newStr.trim() === ""
          ? null
          : Number(newStr.replace(",", "."));
      if (newV !== null && (!Number.isFinite(newV) || newV < 0)) continue;
      if (oldV === newV) continue;
      if (oldV === undefined && newV === null) continue;
      out.push({ rateGroupId: groupId!, durationMin: dur, amount: newV });
    }
    return out;
  }, [original, edited]);

  const hasInvalid = useMemo(() => {
    for (const v of Object.values(edited)) {
      if (v.trim() === "") continue;
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) return true;
    }
    return false;
  }, [edited]);

  const save = async () => {
    if (dirtyCells.length === 0) {
      Alert.alert("Нет изменений");
      return;
    }
    if (hasInvalid) {
      Alert.alert("Проверьте", "В ячейках должны быть неотрицательные числа");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.put<{ ok: boolean; affectedAssignments: number }>(
        "/api/rates/matrix",
        { animatorId, cells: dirtyCells },
      );
      Alert.alert(
        "Сохранено",
        `Изменено ячеек: ${dirtyCells.length}.\nПересчитано будущих назначений: ${data.affectedAssignments}`,
      );
      setLoading(true);
      await load();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Сначала создайте группы ставок</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <Text style={styles.hint}>
            Пустая ячейка = ставка не задана (админ вводит payout вручную при назначении).
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={styles.row}>
                <View style={[styles.groupCell, styles.headerCell]}>
                  <Text style={styles.headerText}>Группа</Text>
                </View>
                {RATE_DURATIONS.map((d) => (
                  <View key={d} style={[styles.durCell, styles.headerCell]}>
                    <Text style={styles.headerText}>{formatDuration(d)}</Text>
                  </View>
                ))}
              </View>

              {groups.map((g) => (
                <View key={g.id} style={styles.row}>
                  <View style={styles.groupCell}>
                    <Text style={styles.groupName} numberOfLines={2}>
                      {g.name}
                    </Text>
                  </View>
                  {RATE_DURATIONS.map((d) => {
                    const k = cellKey(g.id, d);
                    const val = edited[k] ?? "";
                    const orig = original[k];
                    const n =
                      val.trim() === "" ? null : Number(val.replace(",", "."));
                    const isDirty =
                      (orig === undefined && n !== null) ||
                      (orig !== undefined && n !== orig);
                    return (
                      <View key={d} style={styles.durCell}>
                        <TextInput
                          style={[
                            styles.cellInput,
                            isDirty && styles.cellInputDirty,
                          ]}
                          value={val}
                          onChangeText={(v) => setCell(g.id, d, v)}
                          keyboardType="numeric"
                          placeholder="—"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (busy || dirtyCells.length === 0) && { opacity: 0.5 },
            ]}
            onPress={save}
            disabled={busy || dirtyCells.length === 0}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                Сохранить{dirtyCells.length > 0 ? ` (${dirtyCells.length})` : ""}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  row: { flexDirection: "row" },
  headerCell: { backgroundColor: colors.bg },
  headerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "700",
    textAlign: "center",
  },
  groupCell: {
    width: 130,
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupName: { fontSize: 13, fontWeight: "600", color: colors.text },
  durCell: {
    width: 72,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cellInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 13,
    color: colors.text,
    textAlign: "center",
    backgroundColor: "#fff",
  },
  cellInputDirty: { borderColor: colors.primary, backgroundColor: "#fff7ed" },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});