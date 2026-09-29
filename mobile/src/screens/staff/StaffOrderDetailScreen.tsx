import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useFocusEffect, useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../api/client";
import type { Order } from "../../api/types";
import { formatDuration } from "@event-agency/shared";
import { colors } from "../../theme/colors";
import {
  ASSIGNMENT_STATUS_COLORS,
  ASSIGNMENT_STATUS_LABELS,
  CHANGE_FIELD_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  TRANSPORT_POLICY_LABELS,
} from "../../utils/labels";
import type { StaffOrdersStackParamList } from "./StaffOrdersStack";
import { AnimatorPickerModal, PickedAnimator } from "./AnimatorPickerModal";
import { AnimatorAssignmentEditModal } from "./AnimatorAssignmentEditModal";

type RouteT = RouteProp<StaffOrdersStackParamList, "OrderDetail">;
type Nav = NativeStackNavigationProp<StaffOrdersStackParamList, "OrderDetail">;

type EditTarget = {
  animatorId: string;
  animatorName: string;
  payout: number;
};

function fmtMoney(v: any): string {
  return Number(v || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function StaffOrderDetailScreen() {
  const route = useRoute<RouteT>();
  const navigation = useNavigation<Nav>();
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatorPickerVisible, setAnimatorPickerVisible] = useState(false);
  const [animatorBusy, setAnimatorBusy] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [assignTargetSlotId, setAssignTargetSlotId] = useState<string | null>(null);

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

  const callPhone = (phone?: string | null) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const onPickAnimator = async (a: PickedAnimator) => {
    if (!order || !assignTargetSlotId) return;
    setAnimatorBusy(true);
    try {
      await api.post(`/api/orders/${orderId}/animators`, {
        animatorId: a.animatorId,
        slotId: assignTargetSlotId,
      });
      await load();
      Alert.alert("Готово", `${a.firstName} ${a.lastName} назначен(а)`);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error ?? "Не удалось назначить";
      Alert.alert(status === 409 ? "Конфликт" : "Ошибка", msg);
    } finally {
      setAnimatorBusy(false);
      setAssignTargetSlotId(null);
    }
  };

  const removeAnimator = (animatorId: string, name: string) => {
    Alert.alert("Снять аниматора", `Убрать ${name} с заказа?`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Снять",
        style: "destructive",
        onPress: async () => {
          setAnimatorBusy(true);
          try {
            await api.delete(`/api/orders/${orderId}/animators/${animatorId}`);
            await load();
          } catch (e: any) {
            Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось снять");
          } finally {
            setAnimatorBusy(false);
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

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Заказ не найден</Text>
      </View>
    );
  }

  const activeAnimators = (order.animators ?? []).filter(
    (a) => a.status !== "removed" && a.status !== "declined",
  );

  const transportTotal = activeAnimators.reduce(
    (s, a) => s + Number(a.transportCost || 0),
    0,
  );

  const grandTotal = Number(order.clientPrice);
  const prepayment = Number(order.prepaymentAmount || 0);
  const final = Number(order.finalPaymentAmount || 0);
  const debt = grandTotal - prepayment;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { flex: 1 }]}>{order.title}</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("OrderEdit", { orderId: order.id })}
          >
            <Text style={styles.editBtnText}>✎ Редактировать</Text>
          </TouchableOpacity>
        </View>

        {order.description ? <Text style={styles.description}>{order.description}</Text> : null}
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


      <View style={styles.card}>
        <Text style={styles.section}>Стоимость</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Сумма по программе</Text>
          <Text style={styles.totalValue}>{fmtMoney(order.subtotal)} ₽</Text>
        </View>
        {Number(order.discountAmount) > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Скидка {Number(order.discountPercent)}%</Text>
            <Text style={[styles.totalValue, { color: colors.danger }]}>
              −{fmtMoney(order.discountAmount)} ₽
            </Text>
          </View>
        ) : null}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Итого для клиента</Text>
          <Text style={styles.totalValue}>{fmtMoney(order.clientPrice)} ₽</Text>
        </View>

        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>К оплате</Text>
          <Text style={styles.grandTotalValue}>{fmtMoney(grandTotal)} ₽</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Предоплата</Text>
          <Text style={styles.totalValue}>
            {fmtMoney(prepayment)} ₽ {order.prepaymentPaidAt ? "✓" : ""}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Остаток</Text>
          <Text style={[styles.totalValue, { color: debt > 0 ? colors.warning : colors.success }]}>
            {fmtMoney(debt)} ₽
          </Text>
        </View>
      </View>

      {final > 0 ? (
        <View style={styles.card}>
          <Text style={styles.section}>Финальная оплата</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Сумма к получению</Text>
            <Text style={styles.totalValue}>{fmtMoney(final)} ₽</Text>
          </View>

          {order.finalPaymentReceivedAt ? (
            <View style={styles.receivedBox}>
              <Text style={styles.receivedTitle}>
                ✓ Получено ({order.finalPaymentMethod === "cash" ? "наличные" : "перевод"})
              </Text>
              <Text style={styles.receivedMeta}>
                {new Date(order.finalPaymentReceivedAt).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {order.finalPaymentMethod === "cash" ? (
                <Text style={styles.receivedMeta}>
                  {order.finalPaymentHandedAt ? "✓ Сдано в кассу" : "Ожидает сдачи в кассу"}
                </Text>
              ) : (
                <Text style={styles.receivedMeta}>
                  {order.finalPaymentHandedAt ? "✓ Сверено по выписке" : "Ожидает сверки по выписке"}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.muted}>Аниматор ещё не отметил получение</Text>
          )}

          {order.finalPaymentReceivedAt && !order.finalPaymentHandedAt ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSuccess, animatorBusy && { opacity: 0.6 }]}
              disabled={animatorBusy}
              onPress={async () => {
                try {
                  setAnimatorBusy(true);
                  await api.post(`/api/orders/${orderId}/final-payment/handover`);
                  await load();
                } catch (e: any) {
                  Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось");
                } finally {
                  setAnimatorBusy(false);
                }
              }}
            >
              <Text style={styles.actionText}>
                {order.finalPaymentMethod === "cash" ? "Сдал в кассу" : "Сверено по выписке"}
              </Text>
            </TouchableOpacity>
          ) : null}

          {order.finalPaymentReceivedAt && !order.finalPaymentHandedAt ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger, { marginTop: 8 }]}
              disabled={animatorBusy}
              onPress={() => {
                Alert.alert("Отменить отметку?", "Аниматор увидит, что оплата не подтверждена", [
                  { text: "Отмена", style: "cancel" },
                  {
                    text: "Отменить",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        setAnimatorBusy(true);
                        await api.delete(`/api/orders/${orderId}/final-payment`);
                        await load();
                      } catch (e: any) {
                        Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось");
                      } finally {
                        setAnimatorBusy(false);
                      }
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.actionTextDark}>Отменить отметку</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* ПЕРСОНАЖИ И ПРОГРАММА */}
      <View style={styles.card}>
        <Text style={styles.section}>Персонажи и программа</Text>

        {(order.slots ?? []).length === 0 ? (
          <Text style={styles.muted}>Персонажи не добавлены</Text>
        ) : (
          (order.slots ?? []).map((s) => {
            const assignment = (order.animators ?? []).find(
              (a) => a.slotId === s.id && a.status !== "removed" && a.status !== "declined",
            );
            return (
              <View key={s.id} style={styles.slotBlock}>
                <View style={styles.slotHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.value}>
                      🎭 {s.character?.name ?? s.characterNameSnapshot ?? "—"}
                    </Text>
                    <Text style={styles.mutedSmall}>
                      {s.character?.rateGroup?.name ?? ""} · {formatDuration(s.rateDurationMinutes)}
                      {s.isCustomPrice ? " · цена вручную" : ""}
                    </Text>
                  </View>
                  <Text style={styles.slotPrice}>{fmtMoney(s.clientPrice)} ₽</Text>
                </View>

                {assignment ? (
                  <View style={styles.assignmentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.value}>
                        {assignment.animator.firstName} {assignment.animator.lastName}
                      </Text>
                      <Text style={styles.mutedSmall}>
                        Выплата {fmtMoney(assignment.payout)} ₽
                        {assignment.payoutSource === "rate_matrix"
                          ? " · 💠 матрица"
                          : " · ✏️ вручную"}
                      </Text>
                      {assignment.payoutPaidAt ? (
                        <Text style={styles.paidSmall}>
                          ✓ Выплачено{" "}
                          {assignment.payoutMethod === "cash"
                            ? "наличными"
                            : assignment.payoutMethod === "transfer"
                            ? "переводом"
                            : ""}
                        </Text>
                      ) : null}
                      <TouchableOpacity
                        onPress={() => callPhone(assignment.animator.phone)}
                      >
                        <Text style={styles.phone}>{assignment.animator.phone}</Text>
                      </TouchableOpacity>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            ASSIGNMENT_STATUS_COLORS[assignment.status] ?? colors.textMuted,
                        },
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        setEditTarget({
                          animatorId: assignment.animatorId,
                          animatorName: `${assignment.animator.firstName} ${assignment.animator.lastName}`,
                          payout: Number(assignment.payout),
                        })
                      }
                      style={styles.editRowBtn}
                      disabled={animatorBusy}
                    >
                      <Text style={styles.editRowBtnText}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        removeAnimator(
                          assignment.animatorId,
                          `${assignment.animator.firstName} ${assignment.animator.lastName}`,
                        )
                      }
                      style={styles.removeBtn}
                      disabled={animatorBusy}
                    >
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.assignBtn, animatorBusy && { opacity: 0.6 }]}
                    onPress={() => {
                      setAssignTargetSlotId(s.id);
                      setAnimatorPickerVisible(true);
                    }}
                    disabled={animatorBusy}
                  >
                    <Text style={styles.assignBtnText}>+ Назначить аниматора</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Политика транспорта</Text>
        <Text style={styles.value}>{TRANSPORT_POLICY_LABELS[order.transportPolicy]}</Text>

        {activeAnimators.length > 0 ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.section}>Фактический транспорт</Text>
            {activeAnimators.map((a) => (
              <View key={a.id} style={styles.transportRow}>
                <Text style={styles.transportName}>
                  {a.animator.firstName} {a.animator.lastName}
                </Text>
                <Text style={styles.transportAmount}>
                  {Number(a.transportCost) > 0 ? `${fmtMoney(a.transportCost)} ₽` : "—"}
                </Text>
              </View>
            ))}
            {transportTotal > 0 ? (
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Итого на транспорте</Text>
                <Text style={styles.grandTotalValue}>{fmtMoney(transportTotal)} ₽</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      {order.changes && order.changes.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.section}>История изменений</Text>
          {order.changes.map((c, idx) => (
            <View key={c.id} style={[styles.changeRow, idx === 0 && { borderTopWidth: 0 }]}>
              <Text style={styles.changeWhen}>
                {new Date(c.changedAt).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Text style={styles.changeWho}>
                {c.user ? `${c.user.firstName} ${c.user.lastName}` : "—"}
              </Text>
              <Text style={styles.changeWhat}>
                <Text style={styles.changeField}>
                  {CHANGE_FIELD_LABELS[c.field] ?? c.field}:{" "}
                </Text>
                {c.oldValue ? <Text style={styles.changeOld}>{c.oldValue} → </Text> : null}
                <Text style={styles.changeNew}>{c.newValue ?? "—"}</Text>
              </Text>
              {c.summary ? (
                <Text style={styles.changeSummary}>{c.summary}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ height: 20 }} />

      <AnimatorPickerModal
        visible={animatorPickerVisible}
        date={order.eventDate.slice(0, 10)}
        startTime={order.startTime}
        endTime={order.endTime}
        onClose={() => {
          setAnimatorPickerVisible(false);
          setAssignTargetSlotId(null);
        }}
        onPick={onPickAnimator}
      />

      <AnimatorAssignmentEditModal
        visible={!!editTarget}
        orderId={orderId}
        animatorId={editTarget?.animatorId ?? ""}
        animatorName={editTarget?.animatorName ?? ""}
        initialPayout={editTarget?.payout ?? 0}
        onClose={() => setEditTarget(null)}
        onSaved={load}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
  mutedSmall: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  container: { padding: 12 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  description: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  section: { fontSize: 12, color: colors.textMuted, textTransform: "uppercase", marginBottom: 6 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  addSmallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  addSmallBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  value: { fontSize: 15, color: colors.text, marginTop: 2 },
  phone: { fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: "600" },
  paidSmall: { fontSize: 12, color: colors.success, marginTop: 3, fontWeight: "600" },
  row: { flexDirection: "row", marginTop: 8, flexWrap: "wrap" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  animatorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  slotBlock: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  slotHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  slotPrice: { fontSize: 15, fontWeight: "700", color: colors.text },
  assignmentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  assignBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    alignItems: "center",
  },
  assignBtnText: { color: colors.primary, fontSize: 13, fontWeight: "600" },

  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  totalLabel: { fontSize: 14, color: colors.textMuted },
  totalValue: { fontSize: 15, color: colors.text, fontWeight: "600" },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6, paddingTop: 10 },
  grandTotalLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  grandTotalValue: { fontSize: 20, fontWeight: "800", color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  transportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  transportName: { fontSize: 14, color: colors.text },
  transportAmount: { fontSize: 14, fontWeight: "600", color: colors.text },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.bg,
  },
  editBtnText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  editRowBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editRowBtnText: { fontSize: 16, color: colors.primary, fontWeight: "700" },
  removeBtn: { padding: 6 },
  removeText: { fontSize: 16, color: colors.danger },
  changeRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  changeWhen: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  changeWho: { fontSize: 12, color: colors.primary, marginTop: 2 },
  changeWhat: { fontSize: 13, color: colors.text, marginTop: 4 },
  changeField: { fontWeight: "700" },
  changeOld: { color: colors.danger, textDecorationLine: "line-through" },
  changeNew: { color: colors.success, fontWeight: "600" },
  changeSummary: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: "italic" },
  receivedBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  receivedTitle: { fontSize: 14, fontWeight: "700", color: "#166534" },
  receivedMeta: { fontSize: 12, color: "#166534", marginTop: 3 },
  actionBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  actionBtnSuccess: { backgroundColor: colors.success },
  actionBtnDanger: { backgroundColor: "#e5e7eb" },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  actionTextDark: { color: colors.text, fontWeight: "700", fontSize: 14 },
});