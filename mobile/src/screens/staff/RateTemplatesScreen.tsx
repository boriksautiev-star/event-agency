import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "../../theme/colors";
import {
  createTemplate,
  deleteTemplate,
  fetchTemplates,
  RateTemplateListItem,
  updateTemplate,
} from "../../api/rate-templates";
import type { StaffAnimatorsStackParamList } from "./StaffAnimatorsStack";

type Nav = NativeStackNavigationProp<StaffAnimatorsStackParamList>;

export function RateTemplatesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<RateTemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Модалка создания / переименования / копии
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<RateTemplateListItem | null>(null);
  const [copyFromId, setCopyFromId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Bottom-sheet с действиями
  const [actionsFor, setActionsFor] = useState<RateTemplateListItem | null>(null);

  const [kbVisible, setKbVisible] = useState(false);
  React.useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKbVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKbVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchTemplates();
      setItems(data);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openCreate = () => {
    setEditing(null);
    setCopyFromId(null);
    setName("");
    setNotes("");
    setModalVisible(true);
  };

  const openRename = (t: RateTemplateListItem) => {
    setActionsFor(null);
    setEditing(t);
    setCopyFromId(null);
    setName(t.name);
    setNotes(t.notes ?? "");
    setModalVisible(true);
  };

  const openCopy = (t: RateTemplateListItem) => {
    setActionsFor(null);
    setEditing(null);
    setCopyFromId(t.id);
    setName(`${t.name} (копия)`);
    setNotes(t.notes ?? "");
    setModalVisible(true);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert("Проверьте", "Название минимум 2 символа");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await updateTemplate(editing.id, {
          name: trimmed,
          notes: notes.trim() || null,
        });
      } else {
        await createTemplate({
          name: trimmed,
          notes: notes.trim() || null,
          copyFromTemplateId: copyFromId,
        });
      }
      setModalVisible(false);
      load();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (t: RateTemplateListItem) => {
    setActionsFor(null);
    try {
      await updateTemplate(t.id, { isActive: !t.isActive });
      load();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось");
    }
  };

  const remove = (t: RateTemplateListItem) => {
    setActionsFor(null);
    if (t.animatorsCount > 0) {
      Alert.alert(
        "Нельзя удалить",
        `Шаблон используется ${t.animatorsCount} аниматором(ами)`,
      );
      return;
    }
    Alert.alert("Удалить шаблон?", `«${t.name}»`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTemplate(t.id);
            load();
          } catch (e: any) {
            Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось");
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.muted}>Шаблонов пока нет</Text>
            <Text style={styles.mutedSmall}>
              Создайте первый — например, «Новичок»
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.card, !item.isActive && { opacity: 0.5 }]}
            onPress={() =>
              navigation.navigate("RateTemplateEdit", {
                templateId: item.id,
                templateName: item.name,
              })
            }
            onLongPress={() => setActionsFor(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.notes ? (
                <Text style={styles.notes} numberOfLines={2}>
                  {item.notes}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                Ставок: {item.ratesCount} · Аниматоров: {item.animatorsCount}
              </Text>
            </View>
            {!item.isActive ? (
              <View style={styles.badgeOff}>
                <Text style={styles.badgeOffText}>архив</Text>
              </View>
            ) : null}
            <TouchableOpacity
              onPress={() => setActionsFor(item)}
              style={styles.moreBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.moreBtnText}>⋯</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ==== Bottom-sheet: действия с шаблоном ==== */}
      <Modal
        visible={!!actionsFor}
        animationType="slide"
        transparent
        onRequestClose={() => setActionsFor(null)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setActionsFor(null)}
        >
          <View
            style={[styles.actionsSheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.actionsHeader}>
              <Text style={styles.actionsTitle} numberOfLines={2}>
                {actionsFor?.name}
              </Text>
              <TouchableOpacity onPress={() => setActionsFor(null)}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                const t = actionsFor;
                setActionsFor(null);
                if (t) navigation.navigate("RateTemplateEdit", {
                  templateId: t.id,
                  templateName: t.name,
                });
              }}
            >
              <Text style={styles.actionBtnText}>✎ Редактировать ставки</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => actionsFor && openCopy(actionsFor)}
            >
              <Text style={styles.actionBtnText}>📋 Дублировать</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => actionsFor && openRename(actionsFor)}
            >
              <Text style={styles.actionBtnText}>✎ Переименовать</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => actionsFor && toggleActive(actionsFor)}
            >
              <Text style={styles.actionBtnText}>
                {actionsFor?.isActive ? "📦 Перенести в архив" : "✅ Активировать"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={() => actionsFor && remove(actionsFor)}
            >
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>
                🗑 Удалить
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnCancel]}
              onPress={() => setActionsFor(null)}
            >
              <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>
                Отмена
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ==== Модалка создания / переименования / копии ==== */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <View
            style={[
              styles.modalContent,
              { paddingBottom: kbVisible ? 8 : insets.bottom + 16 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editing
                  ? "Переименовать шаблон"
                  : copyFromId
                    ? "Копия шаблона"
                    : "Новый шаблон"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Название</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Например: Новичок"
              autoFocus
            />

            <Text style={styles.label}>Заметка (опционально)</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Для стажёров до 3 месяцев"
            />

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
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14, marginBottom: 4 },
  mutedSmall: { color: colors.textMuted, fontSize: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  notes: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  badgeOff: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  badgeOffText: { fontSize: 11, color: colors.textMuted, fontWeight: "700" },
  moreBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  moreBtnText: { fontSize: 20, color: colors.textMuted, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 30, fontWeight: "300" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },

  // Bottom-sheet actions
  actionsSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  actionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  actionBtn: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtnDanger: {},
  actionBtnCancel: { marginTop: 8, borderTopWidth: 0 },
  actionBtnText: { fontSize: 15, color: colors.text, fontWeight: "600" },

  // Modal создание/переименование
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  close: { fontSize: 20, color: colors.textMuted, padding: 4 },
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
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
