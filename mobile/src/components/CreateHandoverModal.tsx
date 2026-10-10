import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { colors } from "../theme/colors";
import {
  fetchHandoverCandidates,
  createHandover,
  HandoverCandidate,
} from "../api/handover";

type Props = {
  visible: boolean;
  orderId: string;
  slotId: string;
  onClose: () => void;
  onCreated?: () => void;
};

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function CreateHandoverModal({ visible, orderId, slotId, onClose, onCreated }: Props) {
  const [candidates, setCandidates] = useState<HandoverCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setComment("");
    setLoading(true);
    fetchHandoverCandidates(orderId, slotId)
      .then(setCandidates)
      .catch((e) =>
        Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить"),
      )
      .finally(() => setLoading(false));
  }, [visible, orderId, slotId]);

  const handleSubmit = async () => {
    if (!selected) {
      Alert.alert("Выберите аниматора");
      return;
    }
    setBusy(true);
    try {
      await createHandover(orderId, slotId, {
        toAnimatorId: selected,
        comment: comment.trim() || null,
      });
      onCreated?.();
      onClose();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось создать заявку");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Передать заказ</Text>
          <Text style={styles.subtitle}>
            Выберите аниматора, которому хотите передать этот слот.
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : candidates.length === 0 ? (
            <View style={styles.loadingBox}>
              <Text style={styles.muted}>Свободных аниматоров нет</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 260 }}>
              {candidates.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.candidate,
                    selected === c.id && styles.candidateActive,
                  ]}
                  onPress={() => setSelected(c.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.candidateName}>
                      {c.firstName} {c.lastName}
                    </Text>
                    <Text style={styles.candidatePhone}>{c.phone}</Text>
                  </View>
                  <Text style={styles.candidatePayout}>{fmt(c.payout)} ₽</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={styles.label}>Комментарий (опционально)</Text>
          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Например: не смогу приехать, передаю Пете"
            multiline
            numberOfLines={2}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel, busy && styles.btnDisabled]}
              onPress={onClose}
              disabled={busy}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSubmit, busy && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={busy || !selected}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Отправить заявку</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 18,
    maxHeight: "85%",
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 12 },
  loadingBox: { paddingVertical: 30, alignItems: "center" },
  muted: { color: colors.textMuted, fontSize: 14 },
  candidate: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
    backgroundColor: "#fff",
  },
  candidateActive: {
    borderColor: colors.primary,
    backgroundColor: "#eef2ff",
  },
  candidateName: { fontSize: 15, fontWeight: "600", color: colors.text },
  candidatePhone: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  candidatePayout: { fontSize: 14, fontWeight: "700", color: colors.primary },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "#fff",
    minHeight: 54,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
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
  btnSubmit: { backgroundColor: colors.primary },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
