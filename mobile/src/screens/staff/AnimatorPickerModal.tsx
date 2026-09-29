import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../api/client";
import type { AnimatorAvailability } from "../../api/types";
import { colors } from "../../theme/colors";

export type PickedAnimator = {
  animatorId: string;
  firstName: string;
  lastName: string;
};

type Props = {
  visible: boolean;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  onClose: () => void;
  onPick: (a: PickedAnimator) => void;
};

function overlaps(s1: string, e1: string, s2: string, e2: string) {
  return s1 < e2 && s2 < e1;
}

export function AnimatorPickerModal({
  visible,
  date,
  startTime,
  endTime,
  onClose,
  onPick,
}: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AnimatorAvailability[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<{ items: AnimatorAvailability[] }>(
        `/api/animators/availability?date=${date}`,
      );
      setItems(data.items);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить аниматоров");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const pick = (a: AnimatorAvailability) => {
    onPick({
      animatorId: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Выбор аниматора</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.dateLine}>
            Дата: {date} · Время: {startTime}–{endTime}
          </Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 30 }} color={colors.primary} />
          ) : items.length === 0 ? (
            <Text style={[styles.muted, { textAlign: "center", marginTop: 30 }]}>
              Нет активных аниматоров
            </Text>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(a) => a.id}
              style={{ marginTop: 8, maxHeight: 460 }}
              renderItem={({ item }) => {
                const busyOrders = item.orders.filter((o) =>
                  overlaps(startTime, endTime, o.startTime, o.endTime),
                );
                const isBusy = busyOrders.length > 0;

                return (
                  <TouchableOpacity
                    style={[styles.card, isBusy && styles.cardBusy]}
                    onPress={() => {
                      if (isBusy) {
                        Alert.alert(
                          "Аниматор занят",
                          busyOrders
                            .map(
                              (o) =>
                                `«${o.title}» ${o.startTime}–${o.endTime}\n` +
                                (o.slots.length > 0
                                  ? "Персонажи: " +
                                    o.slots
                                      .map((s) => s.characterName)
                                      .join(", ")
                                  : ""),
                            )
                            .join("\n\n"),
                          [
                            { text: "Отмена", style: "cancel" },
                            {
                              text: "Всё равно выбрать",
                              style: "destructive",
                              onPress: () => pick(item),
                            },
                          ],
                        );
                        return;
                      }
                      pick(item);
                    }}
                  >
                    <View style={styles.rowTop}>
                      <Text style={styles.name}>
                        {item.firstName} {item.lastName}
                      </Text>
                      {isBusy ? (
                        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                          <Text style={styles.badgeText}>Занят</Text>
                        </View>
                      ) : (
                        <View style={[styles.badge, { backgroundColor: colors.success }]}>
                          <Text style={styles.badgeText}>Свободен</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.phone}>{item.phone}</Text>

                    {item.orders.length > 0 ? (
                      <View style={{ marginTop: 8 }}>
                        {item.orders.map((o) => {
                          const conflict = overlaps(startTime, endTime, o.startTime, o.endTime);
                          return (
                            <View
                              key={o.orderId}
                              style={[styles.orderRow, conflict && styles.orderRowConflict]}
                            >
                              <Text style={styles.orderTime}>
                                {o.startTime}–{o.endTime}
                              </Text>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.orderTitle}>{o.title}</Text>
                                {o.slots.length > 0 ? (
                                  <Text style={styles.orderServices}>
                                    {o.slots.map((s) => s.characterName).join(", ")}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
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
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  close: { fontSize: 20, color: colors.textMuted, padding: 4 },
  dateLine: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: 8 },
  muted: { color: colors.textMuted, fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBusy: { borderColor: colors.danger },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  phone: { fontSize: 12, color: colors.primary, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  orderRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderRowConflict: { backgroundColor: "#fef2f2" },
  orderTime: { fontSize: 12, fontWeight: "700", color: colors.text, width: 90 },
  orderTitle: { fontSize: 13, color: colors.text, fontWeight: "600" },
  orderServices: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});