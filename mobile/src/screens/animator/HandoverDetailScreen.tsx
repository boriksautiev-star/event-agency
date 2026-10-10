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
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import {
  fetchHandover,
  acceptHandover,
  declineHandover,
  cancelHandover,
  HandoverRequest,
} from "../../api/handover";
import { useAuth } from "../../auth/AuthContext";
import { colors } from "../../theme/colors";
import { HandoverCard } from "../../components/HandoverCard";

type RouteT = RouteProp<{ HandoverDetail: { requestId: string } }, "HandoverDetail">;

export function HandoverDetailScreen() {
  const route = useRoute<RouteT>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { requestId } = route.params;

  const [item, setItem] = useState<HandoverRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [declineComment, setDeclineComment] = useState("");
  const [showDecline, setShowDecline] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchHandover(requestId);
      setItem(data);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить заявку");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  React.useEffect(() => {
    navigation.setOptions({ title: "Заявка на передачу" });
  }, [navigation]);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await acceptHandover(requestId);
      Alert.alert("Готово", "Вы согласились принять заказ. Ждём подтверждения руководителя.");
      await load();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось принять");
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    try {
      await declineHandover(requestId, declineComment.trim() || null);
      Alert.alert("Готово", "Вы отклонили передачу");
      setShowDecline(false);
      setDeclineComment("");
      await load();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось отклонить");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    Alert.alert("Отозвать заявку?", "Заказ останется за вами.", [
      { text: "Нет", style: "cancel" },
      {
        text: "Отозвать",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await cancelHandover(requestId);
            Alert.alert("Готово", "Заявка отозвана");
            await load();
          } catch (e: any) {
            Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось отозвать");
          } finally {
            setBusy(false);
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

  if (!item || !user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Заявка не найдена</Text>
      </View>
    );
  }

  const isIncoming = item.toAnimatorId === user.id;
  const isOutgoing = item.fromAnimatorId === user.id;
  const canAcceptOrDecline =
    isIncoming && item.status === "pending_receiver";
  const canCancel =
    isOutgoing &&
    (item.status === "pending_receiver" || item.status === "pending_approval");

  const other = isIncoming ? item.fromAnimator : item.toAnimator;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {other.phone ? (
          <View style={styles.callBox}>
            <Text style={styles.callLabel}>Связаться с аниматором:</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${other.phone}`)}>
              <Text style={styles.callPhone}>
                {other.firstName} {other.lastName} · {other.phone}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <HandoverCard
          item={item}
          perspective={isIncoming ? "incoming" : "outgoing"}
        />

        {canAcceptOrDecline && !showDecline ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnAccept, busy && styles.btnDisabled]}
              onPress={handleAccept}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Принять</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnDecline, busy && styles.btnDisabled]}
              onPress={() => setShowDecline(true)}
              disabled={busy}
            >
              <Text style={styles.btnText}>Отклонить</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {showDecline ? (
          <View style={styles.card}>
            <Text style={styles.section}>Причина отказа (опционально)</Text>
            <TextInput
              style={styles.input}
              value={declineComment}
              onChangeText={setDeclineComment}
              placeholder="Например: уже занят(а) в это время"
              multiline
              numberOfLines={3}
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel, busy && styles.btnDisabled]}
                onPress={() => {
                  setShowDecline(false);
                  setDeclineComment("");
                }}
                disabled={busy}
              >
                <Text style={[styles.btnText, { color: colors.text }]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnDecline, busy && styles.btnDisabled]}
                onPress={handleDecline}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Отклонить</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {canCancel ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnCancel, busy && styles.btnDisabled, { marginTop: 8 }]}
            onPress={handleCancel}
            disabled={busy}
          >
            <Text style={[styles.btnText, { color: colors.text }]}>Отозвать заявку</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
  container: { padding: 12 },
  callBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  callLabel: { fontSize: 12, color: colors.textMuted },
  callPhone: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "700",
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  section: { fontSize: 12, color: colors.textMuted, textTransform: "uppercase", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "#fff",
    minHeight: 70,
    textAlignVertical: "top",
  },
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
  btnCancel: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
