import React, { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../api/client";
import type { AssignmentStatus, Order, TransportPolicy } from "../../api/types";
import { colors } from "../../theme/colors";
import {
  ASSIGNMENT_STATUS_COLORS,
  ASSIGNMENT_STATUS_LABELS,
  TRANSPORT_POLICY_LABELS,
} from "../../utils/labels";
import { DatePickerField } from "../../components/DatePickerField";
import { TimePickerField } from "../../components/TimePickerField";
import type { StaffOrdersStackParamList } from "./StaffOrdersStack";
import { AnimatorPickerModal, PickedAnimator } from "./AnimatorPickerModal";
import { OrderSlotModal, PickedSlot } from "./OrderSlotModal";
import { formatDuration } from "@event-agency/shared";

type Nav = NativeStackNavigationProp<StaffOrdersStackParamList, "OrderEdit">;
type RouteT = RouteProp<StaffOrdersStackParamList, "OrderEdit">;

const TRANSPORT_POLICIES: TransportPolicy[] = [
  "agency_pays",
  "client_one_way",
  "client_both_ways",
];

function fmtMoney(v: number): string {
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function StaffOrderEditScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { orderId } = route.params;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("17:00");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [transportPolicy, setTransportPolicy] = useState<TransportPolicy>("client_one_way");
  const [prepaymentAmount, setPrepaymentAmount] = useState("");
  const [prepaymentPaid, setPrepaymentPaid] = useState(false);

  const [animators, setAnimators] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [animatorPickerVisible, setAnimatorPickerVisible] = useState(false);
  const [animatorBusy, setAnimatorBusy] = useState(false);
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [slotEditingId, setSlotEditingId] = useState<string | null>(null);
  const [slotBusy, setSlotBusy] = useState(false);
  const [assignTargetSlotId, setAssignTargetSlotId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ order: Order }>(`/api/orders/${orderId}`);
      const o = data.order;
      setTitle(o.title);
      setDescription(o.description ?? "");
      setEventDate(o.eventDate.slice(0, 10));
      setStartTime(o.startTime);
      setEndTime(o.endTime);
      setAddress(o.address ?? "");
      setComment(o.comment ?? "");
      setDiscountPercent(String(Number(o.discountPercent)));
      setTransportPolicy(o.transportPolicy);
      setPrepaymentAmount(String(Number(o.prepaymentAmount)));
      setPrepaymentPaid(!!o.prepaymentPaidAt);
      setSlots(o.slots ?? []);
      setAnimators(
        (o.animators ?? []).filter((a: any) => a.status !== "removed" && a.status !== "declined"),
      );
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить заказ");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  // ==== Аниматоры ====
  const onPickAnimator = async (a: PickedAnimator) => {
    if (!assignTargetSlotId) return;
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
      const msg = e?.response?.data?.error ?? "Не удалось назначить аниматора";
      if (status === 409) {
        Alert.alert("Конфликт", msg);
      } else {
        Alert.alert("Ошибка", msg);
      }
    } finally {
      setAnimatorBusy(false);
      setAssignTargetSlotId(null);
    }
  };

  const removeAnimator = (animatorId: string, name: string) => {
    Alert.alert(
      "Снять аниматора",
      `Убрать ${name} с заказа?`,
      [
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
      ],
    );
  };

  // ==== Слоты ====
  const openAddSlot = () => {
    setSlotEditingId(null);
    setSlotModalVisible(true);
  };

  const openEditSlot = (slotId: string) => {
    setSlotEditingId(slotId);
    setSlotModalVisible(true);
  };

  const onPickSlot = async (slot: PickedSlot) => {
    setSlotBusy(true);
    try {
      if (slotEditingId) {
        await api.patch(`/api/orders/${orderId}/slots/${slotEditingId}`, {
          characterId: slot.characterId,
          rateDurationMinutes: slot.rateDurationMinutes,
          clientPrice: slot.clientPrice,
          isCustomPrice: slot.isCustomPrice,
        });
      } else {
        await api.post(`/api/orders/${orderId}/slots`, {
          characterId: slot.characterId,
          rateDurationMinutes: slot.rateDurationMinutes,
          clientPrice: slot.clientPrice,
          isCustomPrice: slot.isCustomPrice,
          sortOrder: slots.length,
        });
      }
      await load();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось сохранить слот");
    } finally {
      setSlotBusy(false);
      setSlotEditingId(null);
    }
  };

  const removeSlot = (slotId: string, characterName: string) => {
    Alert.alert(
      "Удалить персонажа?",
      `Убрать «${characterName}» из заказа?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            setSlotBusy(true);
            try {
              await api.delete(`/api/orders/${orderId}/slots/${slotId}`);
              await load();
            } catch (e: any) {
              Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось удалить");
            } finally {
              setSlotBusy(false);
            }
          },
        },
      ],
    );
  };

  // ==== Стоимость ====
  const subtotal = +slots.reduce((s, x) => s + Number(x.clientPrice || 0), 0).toFixed(2);
  const discountValue = Math.max(0, Math.min(100, Number(discountPercent.replace(",", ".")) || 0));
  const discountAmount = +(subtotal * (discountValue / 100)).toFixed(2);
  const clientPrice = +(subtotal - discountAmount).toFixed(2);
  const prepaymentValue = Math.max(0, Number(prepaymentAmount.replace(",", ".")) || 0);

  const validate = (): string | null => {
    if (title.trim().length < 2) return "Введите название заказа";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return "Дата должна быть в формате ГГГГ-ММ-ДД";
    if (!/^\d{2}:\d{2}$/.test(startTime)) return "Время начала в формате ЧЧ:ММ";
    if (!/^\d{2}:\d{2}$/.test(endTime)) return "Время конца в формате ЧЧ:ММ";
    if (prepaymentValue > clientPrice) return "Предоплата не может быть больше итоговой суммы";
    return null;
  };

  const onSubmit = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Проверьте форму", err);
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/api/orders/${orderId}`, {
        title: title.trim(),
        description: description.trim() || null,
        eventDate,
        startTime,
        endTime,
        address: address.trim() || null,
        comment: comment.trim() || null,
        discountPercent: discountValue,
        transportPolicy,
        prepaymentAmount: prepaymentValue,
        prepaymentPaid,
      });

      Alert.alert("Готово", "Заказ сохранён", [
        { text: "ОК", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось сохранить заказ");
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

  const editingSlot = slotEditingId ? slots.find((s) => s.id === slotEditingId) : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* ЗАКАЗ */}
        <View style={styles.card}>
          <Text style={styles.section}>Заказ</Text>
          <Text style={styles.label}>Название *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.label}>Описание</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {/* КОГДА */}
        <View style={styles.card}>
          <Text style={styles.section}>Когда</Text>
          <DatePickerField value={eventDate} onChange={setEventDate} label="Дата *" />
          <View style={[styles.row, { marginTop: 10 }]}>
            <View style={{ flex: 1 }}>
              <TimePickerField value={startTime} onChange={setStartTime} label="Начало *" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <TimePickerField value={endTime} onChange={setEndTime} label="Конец *" />
            </View>
          </View>
        </View>

        {/* МЕСТО */}
        <View style={styles.card}>
          <Text style={styles.section}>Место</Text>
          <Text style={styles.label}>Адрес</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} />
        </View>

        {/* ПЕРСОНАЖИ И ПРОГРАММА */}
        <View style={styles.card}>
          <Text style={styles.section}>Персонажи и программа</Text>
          {slots.length === 0 ? (
            <Text style={styles.muted}>Пока ничего не добавлено</Text>
          ) : (
            slots.map((s) => {
              const assignment = animators.find((a) => a.slotId === s.id);
              const charName = s.character?.name ?? s.characterNameSnapshot ?? "—";
              const groupName = s.character?.rateGroup?.name ?? "";
              return (
                <View key={s.id} style={styles.slotBlock}>
                  <View style={styles.slotHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{charName}</Text>
                      <Text style={styles.itemMeta}>
                        {groupName ? `${groupName} · ` : ""}
                        {formatDuration(s.rateDurationMinutes)}
                        {s.isCustomPrice ? " · цена вручную" : ""}
                      </Text>
                    </View>
                    <Text style={styles.slotPrice}>{fmtMoney(Number(s.clientPrice))} ₽</Text>
                    <TouchableOpacity
                      onPress={() => openEditSlot(s.id)}
                      style={styles.slotEditBtn}
                      disabled={slotBusy}
                    >
                      <Text style={styles.slotEditText}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeSlot(s.id, charName)}
                      style={styles.removeBtn}
                      disabled={slotBusy}
                    >
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {assignment ? (
                    <View style={styles.assignmentRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>
                          {assignment.animator.firstName} {assignment.animator.lastName}
                        </Text>
                        <Text style={styles.itemMeta}>
                          Выплата {fmtMoney(Number(assignment.payout))} ₽
                          {assignment.payoutSource === "rate_matrix" ? " · 💠 матрица" : " · ✏️ вручную"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: ASSIGNMENT_STATUS_COLORS[assignment.status as AssignmentStatus] ?? colors.textMuted },
                        ]}
                      >
                        <Text style={styles.badgeText}>
                          {ASSIGNMENT_STATUS_LABELS[assignment.status as AssignmentStatus] ?? assignment.status}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeAnimator(
                          assignment.animatorId,
                          `${assignment.animator.firstName} ${assignment.animator.lastName}`,
                        )}
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

          <TouchableOpacity
            style={[styles.addBtn, slotBusy && { opacity: 0.6 }]}
            onPress={openAddSlot}
            disabled={slotBusy}
          >
            {slotBusy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.addBtnText}>+ Добавить персонажа</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* СТОИМОСТЬ */}
        <View style={styles.card}>
          <Text style={styles.section}>Стоимость</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Сумма по программе</Text>
            <Text style={styles.totalValue}>{fmtMoney(subtotal)} ₽</Text>
          </View>

          <Text style={styles.label}>Скидка, %</Text>
          <TextInput
            style={styles.input}
            value={discountPercent}
            onChangeText={setDiscountPercent}
            keyboardType="numeric"
          />
          {discountAmount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Скидка {discountValue}%</Text>
              <Text style={[styles.totalValue, { color: colors.danger }]}>
                −{fmtMoney(discountAmount)} ₽
              </Text>
            </View>
          ) : null}

          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Итого для клиента</Text>
            <Text style={styles.grandTotalValue}>{fmtMoney(clientPrice)} ₽</Text>
          </View>
        </View>

        {/* ПРЕДОПЛАТА */}
        <View style={styles.card}>
          <Text style={styles.section}>Предоплата</Text>
          <Text style={styles.label}>Сумма, ₽</Text>
          <TextInput
            style={styles.input}
            value={prepaymentAmount}
            onChangeText={setPrepaymentAmount}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPrepaymentPaid((v) => !v)}
          >
            <View style={[styles.checkbox, prepaymentPaid && styles.checkboxActive]}>
              {prepaymentPaid ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>Предоплата получена</Text>
          </TouchableOpacity>
        </View>

        {/* ТРАНСПОРТ */}
        <View style={styles.card}>
          <Text style={styles.section}>Транспорт</Text>
          <View style={{ marginTop: 8 }}>
            {TRANSPORT_POLICIES.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.radioRow}
                onPress={() => setTransportPolicy(p)}
              >
                <View style={[styles.radioDot, transportPolicy === p && styles.radioDotActive]} />
                <Text style={styles.radioText}>{TRANSPORT_POLICY_LABELS[p]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* КОММЕНТАРИЙ */}
        <View style={styles.card}>
          <Text style={styles.section}>Комментарий</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={comment}
            onChangeText={setComment}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
          onPress={onSubmit}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Сохранить изменения</Text>}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      <OrderSlotModal
        visible={slotModalVisible}
        onClose={() => {
          setSlotModalVisible(false);
          setSlotEditingId(null);
        }}
        onPick={onPickSlot}
        initialCharacterId={editingSlot ? editingSlot.characterId : null}
        initialDurationMin={editingSlot ? editingSlot.rateDurationMinutes : null}
        title={slotEditingId ? "Изменить персонажа" : "Добавить персонажа"}
      />

      <AnimatorPickerModal
        visible={animatorPickerVisible}
        date={eventDate}
        startTime={startTime}
        endTime={endTime}
        onClose={() => {
          setAnimatorPickerVisible(false);
          setAssignTargetSlotId(null);
        }}
        onPick={onPickAnimator}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  container: { padding: 12 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  section: { fontSize: 12, color: colors.textMuted, textTransform: "uppercase", marginBottom: 8 },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: 4, marginTop: 8 },
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
  multiline: { minHeight: 70, textAlignVertical: "top" },
  row: { flexDirection: "row" },
  muted: { color: colors.textMuted, fontSize: 13 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  itemName: { fontSize: 15, fontWeight: "600", color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  removeBtn: { padding: 6 },
  removeText: { fontSize: 16, color: colors.danger },

  addBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  addBtnText: { color: colors.primary, fontWeight: "600", fontSize: 15 },

  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  totalLabel: { fontSize: 14, color: colors.textMuted },
  totalValue: { fontSize: 15, color: colors.text, fontWeight: "600" },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6, paddingTop: 12 },
  grandTotalLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  grandTotalValue: { fontSize: 20, fontWeight: "800", color: colors.primary },

  radioRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioDotActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioText: { fontSize: 14, color: colors.text },

  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
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

  slotBlock: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  slotHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  slotPrice: { fontSize: 15, fontWeight: "700", color: colors.text, marginRight: 4 },
  slotEditBtn: { padding: 8 },
  slotEditText: { fontSize: 16, color: colors.primary, fontWeight: "700" },
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
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});