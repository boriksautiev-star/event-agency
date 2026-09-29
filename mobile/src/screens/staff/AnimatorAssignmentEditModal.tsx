import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../api/client";
import { colors } from "../../theme/colors";

type Props = {
  visible: boolean;
  orderId: string;
  animatorId: string;
  animatorName: string;
  initialPayout: number;
  onClose: () => void;
  onSaved: () => void;
};

export function AnimatorAssignmentEditModal({
  visible,
  orderId,
  animatorId,
  animatorName,
  initialPayout,
  onClose,
  onSaved,
}: Props) {
  const insets = useSafeAreaInsets();
  const [kbVisible, setKbVisible] = React.useState(false);
  React.useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKbVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKbVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const [payout, setPayout] = useState(String(initialPayout));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setPayout(String(initialPayout));
    }
  }, [visible, initialPayout]);

  const submit = async () => {
    Keyboard.dismiss();
    const payoutNum = Number(payout.replace(",", "."));
    if (!Number.isFinite(payoutNum) || payoutNum < 0) {
      Alert.alert("Проверьте", "Выплата должна быть неотрицательным числом");
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/api/orders/${orderId}/animators/${animatorId}`, {
        payout: payoutNum,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={[styles.content, { paddingBottom: kbVisible ? 8 : insets.bottom + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Выплата аниматору</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.animatorName}>{animatorName}</Text>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <Text style={styles.label}>Выплата, ₽</Text>
            <TextInput
              style={styles.input}
              value={payout}
              onChangeText={setPayout}
              keyboardType="numeric"
              placeholder="0"
              returnKeyType="done"
              onSubmitEditing={submit}
              blurOnSubmit
            />
            <Text style={styles.hint}>
              Выплата подтянута из матрицы ставок. Изменение вручную зафиксирует её как «вручную».
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
              onPress={submit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Сохранить</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  close: { fontSize: 20, color: colors.textMuted, padding: 4 },
  animatorName: { fontSize: 14, color: colors.textMuted, marginBottom: 12 },

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
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});