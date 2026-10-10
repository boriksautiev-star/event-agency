import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../theme/colors";

export type ReleaseReasonValue = "declined" | "handed_over";

type Props = {
  visible: boolean;
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (reason: ReleaseReasonValue, comment: string) => void;
};

export function ReleaseReasonModal({
  visible,
  busy,
  onCancel,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState<ReleaseReasonValue>("declined");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setReason("declined");
      setComment("");
      setError(null);
    }
  }, [visible]);

  const handleSubmit = () => {
    const text = comment.trim();
    if (text.length < 3) {
      setError("Опишите причину (минимум 3 символа)");
      return;
    }
    setError(null);
    onSubmit(reason, text);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Отказ от заказа</Text>
          <Text style={styles.subtitle}>
            Укажите, пожалуйста, причину — это поможет агентству.
          </Text>

          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, reason === "declined" && styles.tabActive]}
              onPress={() => setReason("declined")}
              disabled={busy}
            >
              <Text
                style={[
                  styles.tabText,
                  reason === "declined" && styles.tabTextActive,
                ]}
              >
                Я отказываюсь
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, reason === "handed_over" && styles.tabActive]}
              onPress={() => setReason("handed_over")}
              disabled={busy}
            >
              <Text
                style={[
                  styles.tabText,
                  reason === "handed_over" && styles.tabTextActive,
                ]}
              >
                Передаю другому
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Например: не могу в это время, уже занят, передал Пете…"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            editable={!busy}
            maxLength={500}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel, busy && styles.btnDisabled]}
              onPress={onCancel}
              disabled={busy}
            >
              <Text style={styles.btnCancelText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSubmit, busy && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnSubmitText}>Подтвердить</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 14 },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    gap: 3,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.text },
  tabTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "#fff",
    minHeight: 80,
    textAlignVertical: "top",
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancel: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnCancelText: { color: colors.text, fontWeight: "600", fontSize: 14 },
  btnSubmit: { backgroundColor: colors.danger },
  btnSubmitText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
});
