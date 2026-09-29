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
import type { TransportPolicy } from "../../api/types";
import { colors } from "../../theme/colors";
import { TRANSPORT_POLICY_LABELS } from "../../utils/labels";
import { formatDuration } from "@event-agency/shared";
import { DatePickerField } from "../../components/DatePickerField";
import { TimePickerField } from "../../components/TimePickerField";
import type { StaffOrdersStackParamList } from "./StaffOrdersStack";
import type { Client } from "./StaffClientsScreen";
import { OrderSlotModal, PickedSlot } from "./OrderSlotModal";

type Nav = NativeStackNavigationProp<StaffOrdersStackParamList, "OrderCreate">;
type RouteT = RouteProp<StaffOrdersStackParamList, "OrderCreate">;
type ClientMode = "existing" | "new";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TRANSPORT_POLICIES: TransportPolicy[] = [
  "agency_pays",
  "client_one_way",
  "client_both_ways",
];

function fmtMoney(v: number): string {
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function StaffOrderCreateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("17:00");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [transportPolicy, setTransportPolicy] = useState<TransportPolicy>("client_one_way");
  const [prepaymentAmount, setPrepaymentAmount] = useState("");
  const [prepaymentPaid, setPrepaymentPaid] = useState(false);

  const [slots, setSlots] = useState<PickedSlot[]>([]);
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [slotEditingIndex, setSlotEditingIndex] = useState<number | null>(null);

  const [clientMode, setClientMode] = useState<ClientMode>("existing");
  const [client, setClient] = useState<Client | null>(null);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const [busy, setBusy] = useState(false);

  // Приём выбранного клиента из ClientPicker
  useEffect(() => {
    const picked = route.params?.pickedClient;
    if (picked) {
      setClient(picked);
      setClientMode("existing");
      navigation.setParams({ pickedClient: undefined } as any);
    }
  }, [route.params?.pickedClient, navigation]);

  const openAddSlot = () => {
    setSlotEditingIndex(null);
    setSlotModalVisible(true);
  };

  const openEditSlot = (index: number) => {
    setSlotEditingIndex(index);
    setSlotModalVisible(true);
  };

  const onPickSlot = (slot: PickedSlot) => {
    if (slotEditingIndex === null) {
      setSlots((prev) => [...prev, slot]);
    } else {
      setSlots((prev) =>
        prev.map((x, i) => (i === slotEditingIndex ? slot : x)),
      );
    }
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = +slots.reduce((s, x) => s + x.clientPrice, 0).toFixed(2);
  const discountValue = Math.max(0, Math.min(100, Number(discountPercent.replace(",", ".")) || 0));
  const discountAmount = +(subtotal * (discountValue / 100)).toFixed(2);
  const clientPrice = +(subtotal - discountAmount).toFixed(2);
  const prepaymentValue = Math.max(0, Number(prepaymentAmount.replace(",", ".")) || 0);

  const validate = (): string | null => {
    if (clientMode === "existing") {
      if (!client) return "Выберите клиента или переключитесь на «Новый»";
    } else {
      if (newName.trim().length < 2) return "Введите имя нового клиента";
      if (newPhone.trim().length < 5) return "Введите телефон нового клиента";
    }
    if (title.trim().length < 2) return "Введите название заказа";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return "Дата должна быть в формате ГГГГ-ММ-ДД";
    if (!/^\d{2}:\d{2}$/.test(startTime)) return "Время начала в формате ЧЧ:ММ";
    if (!/^\d{2}:\d{2}$/.test(endTime)) return "Время конца в формате ЧЧ:ММ";
    if (slots.length === 0) return "Добавьте хотя бы одного персонажа";
    if (prepaymentValue > clientPrice) return "Предоплата не может быть больше итоговой суммы";
    return null;
  };

  const createClientIfNeeded = async (): Promise<string> => {
    if (clientMode === "existing") return client!.id;
    try {
      const { data } = await api.post<{ client: Client }>("/api/clients", {
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || null,
        address: newAddress.trim() || null,
      });
      return data.client.id;
    } catch (e: any) {
      if (e?.response?.status === 409) {
        const { data } = await api.get<{ items: Client[] }>(
          `/api/clients?search=${encodeURIComponent(newPhone.trim())}`,
        );
        const found = data.items.find((c) => c.phone === newPhone.trim()) ?? data.items[0];
        if (found) {
          Alert.alert(
            "Клиент уже существует",
            `Найден клиент «${found.name}». Заказ будет создан для него.`,
          );
          return found.id;
        }
      }
      throw e;
    }
  };

  const onSubmit = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Проверьте форму", err);
      return;
    }
    setBusy(true);
    try {
      const clientId = await createClientIfNeeded();
      await api.post("/api/orders", {
        clientId,
        title: title.trim(),
        description: description.trim() || null,
        eventDate,
        startTime,
        endTime,
        address: address.trim() || null,
        comment: comment.trim() || null,
        slots: slots.map((s, idx) => ({
          characterId: s.characterId,
          rateDurationMinutes: s.rateDurationMinutes,
          clientPrice: s.clientPrice,
          isCustomPrice: s.isCustomPrice,
          sortOrder: idx,
        })),
        discountPercent: discountValue,
        transportPolicy,
        prepaymentAmount: prepaymentValue,
        prepaymentPaid,
      });
      navigation.goBack();
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error ?? "Не удалось создать заказ";
      if (status === 409) {
        Alert.alert("Конфликт", msg);
      } else {
        Alert.alert("Ошибка", msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* КЛИЕНТ */}
        <View style={styles.card}>
          <Text style={styles.section}>Клиент</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, clientMode === "existing" && styles.modeBtnActive]}
              onPress={() => setClientMode("existing")}
            >
              <Text style={[styles.modeText, clientMode === "existing" && styles.modeTextActive]}>
                Существующий
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, clientMode === "new" && styles.modeBtnActive]}
              onPress={() => setClientMode("new")}
            >
              <Text style={[styles.modeText, clientMode === "new" && styles.modeTextActive]}>
                Новый
              </Text>
            </TouchableOpacity>
          </View>

          {clientMode === "existing" ? (
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => navigation.navigate("ClientPicker")}
            >
              <Text style={[styles.pickerText, !client && { color: colors.textMuted }]}>
                {client ? `${client.name} · ${client.phone}` : "Выбрать клиента"}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.label}>Имя *</Text>
              <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Петров Пётр" />
              <Text style={styles.label}>Телефон *</Text>
              <TextInput style={styles.input} value={newPhone} onChangeText={setNewPhone} placeholder="+79001112233" keyboardType="phone-pad" />
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} placeholder="petrov@example.com" keyboardType="email-address" autoCapitalize="none" />
              <Text style={styles.label}>Адрес</Text>
              <TextInput style={styles.input} value={newAddress} onChangeText={setNewAddress} placeholder="Москва, ул. Ленина, 1" />
            </>
          )}
        </View>

        {/* ЗАКАЗ */}
        <View style={styles.card}>
          <Text style={styles.section}>Заказ</Text>
          <Text style={styles.label}>Название *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="День рождения 7 лет" />
          <Text style={styles.label}>Описание</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Комментарий для команды"
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
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Москва, ул. Тверская, 10" />
        </View>

        {/* ПЕРСОНАЖИ И ПРОГРАММА */}
        <View style={styles.card}>
          <Text style={styles.section}>Персонажи и программа</Text>
          <Text style={styles.muted}>
            Укажите, какие персонажи нужны, на сколько минут и по какой цене.
            Аниматоров можно назначить позже.
          </Text>

          {slots.length === 0 ? (
            <Text style={[styles.muted, { marginTop: 8 }]}>Пока ничего не добавлено</Text>
          ) : (
            slots.map((s, idx) => (
              <View key={idx} style={styles.slotBlock}>
                <View style={styles.slotRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{s.characterName}</Text>
                    <Text style={styles.itemMeta}>
                      {s.rateGroupName} · {formatDuration(s.rateDurationMinutes)}
                      {s.isCustomPrice ? " · цена вручную" : ""}
                    </Text>
                  </View>
                  <Text style={styles.slotPrice}>{fmtMoney(s.clientPrice)} ₽</Text>
                  <TouchableOpacity onPress={() => openEditSlot(idx)} style={styles.slotEditBtn}>
                    <Text style={styles.slotEditText}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeSlot(idx)} style={styles.removeBtn}>
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.addBtn} onPress={openAddSlot}>
            <Text style={styles.addBtnText}>+ Добавить персонажа</Text>
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
            placeholder="0"
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
            placeholder="0"
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
          <Text style={styles.muted}>Фактическую сумму указывает аниматор после заказа</Text>
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
            placeholder="Парковка, доступ, контакты на месте"
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
          onPress={onSubmit}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Создать заказ</Text>}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      <OrderSlotModal
        visible={slotModalVisible}
        onClose={() => setSlotModalVisible(false)}
        onPick={onPickSlot}
        initialCharacterId={
          slotEditingIndex !== null && slots[slotEditingIndex]
            ? slots[slotEditingIndex].characterId
            : null
        }
        initialDurationMin={
          slotEditingIndex !== null && slots[slotEditingIndex]
            ? slots[slotEditingIndex].rateDurationMinutes
            : null
        }
        title={slotEditingIndex !== null ? "Изменить персонажа" : "Добавить персонажа"}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  pickerBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginTop: 8,
  },
  pickerText: { fontSize: 15, color: colors.text },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modeRow: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: 10, padding: 3, marginBottom: 4 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  modeBtnActive: { backgroundColor: colors.primary },
  modeText: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
  modeTextActive: { color: "#fff" },

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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  slotRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  slotPrice: { fontSize: 15, fontWeight: "700", color: colors.text, marginRight: 4 },
  slotEditBtn: { padding: 8 },
  slotEditText: { fontSize: 16, color: colors.primary, fontWeight: "700" },
});