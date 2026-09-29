import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RATE_DURATIONS, formatDuration } from "@event-agency/shared";
import { api } from "../../api/client";
import type { Character, RateGroup } from "../../api/types";
import { colors } from "../../theme/colors";
import type { StaffAnimatorsStackParamList } from "./StaffAnimatorsStack";

type Nav = NativeStackNavigationProp<StaffAnimatorsStackParamList, "CharacterForm">;
type RouteT = RouteProp<StaffAnimatorsStackParamList, "CharacterForm">;

type PriceRow = {
  durationMin: number;
  price: string;
};

export function CharacterFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const characterId = route.params?.characterId;
  const isEdit = !!characterId;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [groups, setGroups] = useState<RateGroup[]>([]);

  const [name, setName] = useState("");
  const [rateGroupId, setRateGroupId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [prices, setPrices] = useState<PriceRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const grRes = await api.get<{ items: RateGroup[] }>("/api/rate-groups");
        setGroups(grRes.data.items);
        if (grRes.data.items.length > 0 && !rateGroupId) {
          setRateGroupId(grRes.data.items[0].id);
        }

        if (isEdit) {
          const { data } = await api.get<{ character: Character }>(
            `/api/characters/${characterId}`,
          );
          setName(data.character.name);
          setRateGroupId(data.character.rateGroupId);
          setNotes(data.character.notes ?? "");
          setIsActive(data.character.isActive);
          setPrices(
            (data.character.priceOptions ?? []).map((p) => ({
              durationMin: p.durationMin,
              price: String(Number(p.price)),
            })),
          );
        }
      } catch (e: any) {
        Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? "Редактирование" : "Новый персонаж",
    });
  }, [navigation, isEdit]);

  // Доступные длительности: те, что ещё не заняты в списке
  const availableDurations = useMemo(() => {
    const used = new Set(prices.map((p) => p.durationMin));
    return RATE_DURATIONS.filter((d) => !used.has(d));
  }, [prices]);

  const addPrice = () => {
    if (availableDurations.length === 0) {
      Alert.alert("Все длительности уже заданы");
      return;
    }
    setPrices((prev) => [
      ...prev,
      { durationMin: availableDurations[0], price: "" },
    ]);
  };

  const updatePriceRow = (index: number, patch: Partial<PriceRow>) => {
    setPrices((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const removePriceRow = (index: number) => {
    setPrices((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (name.trim().length < 1) {
      Alert.alert("Проверьте", "Введите название");
      return;
    }
    if (!rateGroupId) {
      Alert.alert("Проверьте", "Выберите группу");
      return;
    }

    // Валидация цен
    const cleanPrices: { durationMin: number; price: number }[] = [];
    for (const p of prices) {
      if (p.price.trim() === "") continue;
      const priceNum = Number(p.price.replace(",", "."));
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        Alert.alert("Проверьте", `Некорректная цена для ${formatDuration(p.durationMin)}`);
        return;
      }
      cleanPrices.push({ durationMin: p.durationMin, price: priceNum });
    }

    setBusy(true);
    try {
      const base = {
        name: name.trim(),
        rateGroupId,
        notes: notes.trim() || null,
        isActive,
      };

      if (isEdit) {
        await api.patch(`/api/characters/${characterId}`, base);
        await api.put(`/api/characters/${characterId}/prices`, {
          prices: cleanPrices,
        });
      } else {
        await api.post("/api/characters", { ...base, prices: cleanPrices });
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    Alert.alert("Удалить персонажа?", `«${name}»`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/api/characters/${characterId}`);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось удалить");
          }
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Название *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Пират Джек"
          />

          <Text style={styles.label}>Группа *</Text>
          <View style={styles.chips}>
            {groups.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.chip, rateGroupId === g.id && styles.chipActive]}
                onPress={() => setRateGroupId(g.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    rateGroupId === g.id && styles.chipTextActive,
                  ]}
                >
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Заметки</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Например: только с 5 лет"
            multiline
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Активен</Text>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>
        </View>

        {/* ЦЕНЫ ДЛЯ КЛИЕНТА */}
        <View style={styles.card}>
          <Text style={styles.section}>Цены для клиента</Text>
          <Text style={styles.hint}>
            Сколько клиент платит за этого персонажа по длительностям.
          </Text>

          {prices.length === 0 ? (
            <Text style={[styles.hint, { marginTop: 8 }]}>Пока ни одной цены</Text>
          ) : (
            prices
              .slice()
              .sort((a, b) => a.durationMin - b.durationMin)
              .map((p) => {
                const idx = prices.findIndex((x) => x === p);
                return (
                  <View key={p.durationMin} style={styles.priceRow}>
                    <Text style={styles.priceDuration}>
                      {formatDuration(p.durationMin)}
                    </Text>
                    <TextInput
                      style={[styles.input, styles.priceInput]}
                      value={p.price}
                      onChangeText={(v) => updatePriceRow(idx, { price: v })}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                    <Text style={styles.rub}>₽</Text>
                    <TouchableOpacity
                      onPress={() => removePriceRow(idx)}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
          )}

          <TouchableOpacity
            style={[styles.addPriceBtn, availableDurations.length === 0 && { opacity: 0.5 }]}
            onPress={addPrice}
            disabled={availableDurations.length === 0}
          >
            <Text style={styles.addPriceText}>+ Добавить длительность</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {isEdit ? "Сохранить" : "Добавить"}
            </Text>
          )}
        </TouchableOpacity>

        {isEdit ? (
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.danger }]}
            onPress={remove}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.danger }]}>
              Удалить
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  container: { padding: 12 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  section: { fontSize: 12, color: colors.textMuted, textTransform: "uppercase", marginBottom: 4 },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  label: { fontSize: 13, color: colors.textMuted, marginTop: 12, marginBottom: 6 },
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  priceDuration: { fontSize: 14, fontWeight: "600", color: colors.text, width: 80 },
  priceInput: { flex: 1 },
  rub: { fontSize: 15, color: colors.textMuted },
  removeBtn: { padding: 6 },
  removeText: { fontSize: 16, color: colors.danger },
  addPriceBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
    alignItems: "center",
  },
  addPriceText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
});