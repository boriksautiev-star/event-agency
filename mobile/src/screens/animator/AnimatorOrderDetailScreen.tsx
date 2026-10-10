import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { api } from "../../api/client";
import type { AssignmentStatus, Order, PaymentMethod } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { colors } from "../../theme/colors";
import {
  ReleaseReasonModal,
  ReleaseReasonValue,
} from "../../components/ReleaseReasonModal";
import {
  ASSIGNMENT_STATUS_COLORS,
  ASSIGNMENT_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  TRANSPORT_POLICY_LABELS,
} from "../../utils/labels";
type RouteT = RouteProp<{ OrderDetail: { orderId: string } }, "OrderDetail">;

function fmtMoney(v: any): string {
  return Number(v || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function AnimatorOrderDetailScreen() {
  const route = useRoute<RouteT>();
  const { orderId } = route.params;
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [transportInput, setTransportInput] = useState("");
  const [declineModalVisible, setDeclineModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ order: Order }>(`/api/orders/${orderId}`);
      setOrder(data.order);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить заказ");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const myAssignment = order?.animators?.find((a) => a.animatorId === user?.id);

  React.useEffect(() => {
    if (myAssignment && transportInput === "") {
      const t = Number(myAssignment.transportCost || 0);
      setTransportInput(t > 0 ? String(t) : "");
    }
  }, [myAssignment]);

  const changeStatus = async (
    status: AssignmentStatus,
    release?: { releaseReason: ReleaseReasonValue; releaseComment: string },
  ) => {
    if (!user || !order) return;
    setBusy(true);
    try {
      await api.patch(`/api/orders/${order.id}/animators/${user.id}`, {
        status,
        ...(release
          ? {
              releaseReason: release.releaseReason,
              releaseComment: release.releaseComment,
            }
          : {}),
      });
      await load();
      const labels: Record<string, string> = {
        accepted: "Вы приняли заказ",
        declined: "Вы отказались от заказа",
        completed: "Заказ отмечен как выполненный",
      };
      Alert.alert("Готово", labels[status] ?? "Статус обновлён");
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось обновить статус");
    } finally {
      setBusy(false);
    }
  };

  const handleDeclineSubmit = async (
    reason: ReleaseReasonValue,
    comment: string,
  ) => {
    setDeclineModalVisible(false);
    await changeStatus("declined", {
      releaseReason: reason,
      releaseComment: comment,
    });
  };

  const markFinalPayment = async (method: PaymentMethod) => {
    if (!order) return;
    const label = method === "cash" ? "наличными" : "переводом";
    Alert.alert(
      "Подтверждение получения",
      `Подтверждаете, что получили ${fmtMoney(order.finalPaymentAmount)} ₽ ${label}?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Да, получил",
          onPress: async () => {
            setBusy(true);
            try {
              await api.post(`/api/orders/${order.id}/final-payment`, { method });
              await load();
              Alert.alert("Готово", "Сумма отмечена как полученная");
            } catch (e: any) {
              Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось отметить");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const saveTransport = async () => {
    if (!user || !order) return;
    Keyboard.dismiss();
    const cost = Number(transportInput.replace(",", "."));
    if (!Number.isFinite(cost) || cost < 0) {
      Alert.alert("Проверьте", "Сумма должна быть неотрицательным числом");
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/api/orders/${order.id}/animators/${user.id}/transport`, {
        transportCost: cost,
      });
      await load();
      Alert.alert("Готово", "Сумма такси сохранена");
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const callPhone = (phone?: string | null) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Заказ не найден</Text>
      </View>
    );
  }

  const status = myAssignment?.status;
  const finalAmount = Number(order.finalPaymentAmount || 0);
  const finalReceived = !!order.finalPaymentReceivedAt;
  const finalHanded = !!order.finalPaymentHandedAt;
  const canMarkFinal =
    finalAmount > 0 &&
    !finalReceived &&
    (status === "accepted" || status === "completed") &&
    order.status !== "cancelled";

  const transportPolicy = order.transportPolicy;
  const transportSaved = Number(myAssignment?.transportCost || 0);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{order.title}</Text>
          {order.description ? (
            <Text style={styles.description}>{order.description}</Text>
          ) : null}

          <View style={styles.row}>
            <View
              style={[
                styles.badge,
                { backgroundColor: ORDER_STATUS_COLORS[order.status] ?? colors.textMuted },
              ]}
            >
              <Text style={styles.badgeText}>
                {ORDER_STATUS_LABELS[order.status] ?? order.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Когда</Text>
          <Text style={styles.value}>
            {new Date(order.eventDate).toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Text style={styles.value}>
            {order.startTime} — {order.endTime}
          </Text>
        </View>

        {order.address ? (
          <View style={styles.card}>
            <Text style={styles.section}>Адрес</Text>
            <Text style={styles.value}>{order.address}</Text>
          </View>
        ) : null}

        {order.client ? (
          <View style={styles.card}>
            <Text style={styles.section}>Клиент</Text>
            <Text style={styles.value}>{order.client.name}</Text>
            <TouchableOpacity onPress={() => callPhone(order.client?.phone)}>
              <Text style={styles.phone}>{order.client.phone}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ОПЛАТА */}
        <View style={styles.card}>
          <Text style={styles.section}>Оплата</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Итого для клиента</Text>
            <Text style={styles.totalValue}>{fmtMoney(order.clientPrice)} ₽</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Предоплата</Text>
            <Text style={styles.totalValue}>
              {fmtMoney(order.prepaymentAmount)} ₽ {order.prepaymentPaidAt ? "✓" : "—"}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandLabel}>Остаток к получению</Text>
            <Text style={styles.grandValue}>{fmtMoney(finalAmount)} ₽</Text>
          </View>

          {finalReceived ? (
            <View style={styles.receivedBox}>
              <Text style={styles.receivedTitle}>✓ Получено {fmtMoney(finalAmount)} ₽</Text>
              <Text style={styles.receivedMeta}>
                {order.finalPaymentMethod === "cash" ? "Наличные" : "Перевод"} ·{" "}
                {new Date(order.finalPaymentReceivedAt!).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {order.finalPaymentMethod === "cash" ? (
                <Text style={styles.receivedMeta}>
                  {finalHanded ? "✓ Сдано в кассу" : "Ожидает сдачи в кассу директору"}
                </Text>
              ) : (
                <Text style={styles.receivedMeta}>
                  {finalHanded ? "✓ Сверено по выписке" : "Ожидает сверки по выписке"}
                </Text>
              )}
            </View>
          ) : null}

          {canMarkFinal ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnTransfer, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => markFinalPayment("transfer")}
              >
                <Text style={styles.btnText}>Клиент перевёл</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnCash, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => markFinalPayment("cash")}
              >
                <Text style={styles.btnText}>Получил наличные</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* ТРАНСПОРТ */}
        {myAssignment ? (
          <View style={styles.card}>
            <Text style={styles.section}>Транспорт (такси)</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Политика по заказу</Text>
              <Text style={styles.infoValue}>
                {TRANSPORT_POLICY_LABELS[transportPolicy] ?? transportPolicy}
              </Text>
            </View>

            {transportPolicy === "client_both_ways" ? (
              <Text style={styles.lockedHint}>
                Клиент оплачивает такси сам. От вас ничего не требуется.
              </Text>
            ) : myAssignment.transportLockedAt ? (
              <View>
                <View style={styles.transportSavedBox}>
                  <View style={styles.transportSavedRow}>
                    <Text style={styles.transportSavedLabel}>Расход агентства</Text>
                    <Text style={styles.transportSavedValue}>{fmtMoney(transportSaved)} ₽</Text>
                  </View>
                </View>
                <Text style={styles.lockedHint}>
                  Сумма уже зафиксирована. Изменения — только через директора.
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.label}>
                  {transportPolicy === "agency_pays"
                    ? "Сумма такси туда-обратно (оплачивает агентство), ₽"
                    : "Сумма такси в одну сторону (оплачивает агентство), ₽"}
                </Text>
                <TextInput
                  style={styles.input}
                  value={transportInput}
                  onChangeText={setTransportInput}
                  keyboardType="numeric"
                  placeholder="Например, 400"
                  returnKeyType="done"
                  onSubmitEditing={saveTransport}
                />
                <Text style={styles.lockWarning}>Внимание: изменить можно только один раз.</Text>

                <TouchableOpacity
                  style={[styles.btn, styles.btnSave, busy && styles.btnDisabled]}
                  disabled={busy}
                  onPress={saveTransport}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Сохранить</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        {myAssignment ? (
          <View style={styles.card}>
            <Text style={styles.section}>Условия</Text>
            <Text style={styles.value}>
              
            </Text>
            <Text style={styles.value}>Выплата: {fmtMoney(myAssignment.payout)} ₽</Text>
            <View style={styles.row}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      ASSIGNMENT_STATUS_COLORS[myAssignment.status] ?? colors.textMuted,
                  },
                ]}
              >
                <Text style={styles.badgeText}>
                  {ASSIGNMENT_STATUS_LABELS[myAssignment.status] ?? myAssignment.status}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ height: 20 }} />

        {status === "invited" ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnAccept, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => changeStatus("accepted")}
            >
              <Text style={styles.btnText}>Принять</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnDecline, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => setDeclineModalVisible(true)}
            >
              <Text style={styles.btnText}>Отклонить</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {status === "accepted" && order.status !== "completed" ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnComplete, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={() => changeStatus("completed")}
          >
            <Text style={styles.btnText}>Отметить выполненным</Text>
          </TouchableOpacity>
        ) : null}

        {busy ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} /> : null}
      </ScrollView>

      <ReleaseReasonModal
        visible={declineModalVisible}
        busy={busy}
        onCancel={() => setDeclineModalVisible(false)}
        onSubmit={handleDeclineSubmit}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
  container: { padding: 12 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  description: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  section: { fontSize: 12, color: colors.textMuted, textTransform: "uppercase", marginBottom: 6 },
  value: { fontSize: 15, color: colors.text, marginTop: 2 },
  label: { fontSize: 13, color: colors.textMuted, marginTop: 10, marginBottom: 4 },
  phone: { fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: "600" },
  row: { flexDirection: "row", marginTop: 8, flexWrap: "wrap" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnAccept: { backgroundColor: colors.success },
  btnDecline: { backgroundColor: colors.danger },
  btnComplete: { backgroundColor: colors.primary },
  btnTransfer: { backgroundColor: colors.primary },
  btnCash: { backgroundColor: "#0ea5e9" },
  btnSave: { backgroundColor: colors.primary, marginTop: 12 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  totalLabel: { fontSize: 14, color: colors.textMuted },
  totalValue: { fontSize: 15, color: colors.text, fontWeight: "600" },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6, paddingTop: 10 },
  grandLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  grandValue: { fontSize: 20, fontWeight: "800", color: colors.primary },

  receivedBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  receivedTitle: { fontSize: 15, fontWeight: "700", color: "#166534" },
  receivedMeta: { fontSize: 13, color: "#166534", marginTop: 4 },

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
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  infoLabel: { fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 13, color: colors.text, fontWeight: "600" },

  transportSavedBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: colors.border,
  },
  transportSavedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  transportSavedLabel: { fontSize: 13, color: colors.textMuted },
  transportSavedValue: { fontSize: 13, color: colors.text, fontWeight: "600" },
  lockWarning: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 6,
    fontWeight: "600",
  },
  lockedHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    fontStyle: "italic",
  },
});