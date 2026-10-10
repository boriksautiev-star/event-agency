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
import type { User } from "../../api/types";
import { colors } from "../../theme/colors";
import type { StaffAnimatorsStackParamList } from "./StaffAnimatorsStack";

type Nav = NativeStackNavigationProp<StaffAnimatorsStackParamList, "AnimatorForm">;
type RouteT = RouteProp<StaffAnimatorsStackParamList, "AnimatorForm">;

export function StaffAnimatorFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const animatorId = route.params?.animatorId;
  const isEdit = !!animatorId;

  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"active" | "blocked" | "invited">("active");

  // Загрузка если редактирование
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await api.get<{ user: User }>(`/api/users/${animatorId}`);
        setFirstName(data.user.firstName);
        setLastName(data.user.lastName);
        setPhone(data.user.phone);
        setEmail(data.user.email ?? "");
        setStatus(data.user.status as any);
      } catch (e: any) {
        Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, animatorId]);

  // Установить заголовок
  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? "Редактирование" : "Новый аниматор",
    });
  }, [navigation, isEdit]);

  const validate = (): string | null => {
    if (firstName.trim().length < 2) return "Введите имя";
    if (lastName.trim().length < 2) return "Введите фамилию";
    if (phone.trim().length < 5) return "Введите телефон";
    if (!isEdit && password.length < 6) return "Пароль минимум 6 символов";
    return null;
  };

  const create = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Проверьте форму", err);
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/users", {
        role: "animator",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        password,
      });
      Alert.alert("Готово", "Аниматор добавлен", [
        { text: "ОК", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось создать");
    } finally {
      setBusy(false);
    }
  };

  const update = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Проверьте форму", err);
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/api/users/${animatorId}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        status,
      });
      Alert.alert("Готово", "Данные сохранены", [
        { text: "ОК", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = () => {
    Alert.prompt?.(
      "Новый пароль",
      "Минимум 6 символов",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Сохранить",
          onPress: async (newPass?: string) => {
            if (!newPass || newPass.length < 6) {
              Alert.alert("Ошибка", "Пароль минимум 6 символов");
              return;
            }
            try {
              await api.patch(`/api/users/${animatorId}/password`, { password: newPass });
              Alert.alert("Готово", "Пароль обновлён");
            } catch (e: any) {
              Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось");
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const remove = () => {
    Alert.alert(
      "Заблокировать",
      `Заблокировать ${firstName} ${lastName}?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Заблокировать",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/api/users/${animatorId}`);
              Alert.alert("Готово", "Пользователь заблокирован", [
                { text: "ОК", onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.section}>Личные данные</Text>

          <Text style={styles.label}>Имя *</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Анна" />

          <Text style={styles.label}>Фамилия *</Text>
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Сидорова" />

          <Text style={styles.label}>Телефон *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+79007778899"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="anna@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {!isEdit ? (
          <View style={styles.card}>
            <Text style={styles.section}>Доступ</Text>
            <Text style={styles.label}>Пароль *</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Минимум 6 символов"
              secureTextEntry
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.section}>Статус</Text>
            <View style={styles.statusRow}>
              {(["active", "blocked", "invited"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, status === s && styles.statusBtnActive]}
                  onPress={() => setStatus(s)}
                >
                  <Text
                    style={[styles.statusText, status === s && styles.statusTextActive]}
                  >
                    {s === "active" ? "Активен" : s === "blocked" ? "Заблокирован" : "Приглашён"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.secondaryBtn} onPress={changePassword}>
              <Text style={styles.secondaryBtnText}>Сменить пароль</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 10 }]}
              onPress={() =>
                navigation.navigate("RateMatrix", {
                  animatorId: animatorId!,
                  animatorName: `${firstName} ${lastName}`.trim(),
                })
              }
            >
              <Text style={styles.secondaryBtnText}>💰 Ставки аниматора</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 10 }]}
              onPress={() =>
                navigation.navigate("AnimatorReport", {
                  animatorId: animatorId!,
                  animatorName: `${firstName} ${lastName}`.trim(),
                })
              }
            >
              <Text style={styles.secondaryBtnText}>📊 Отчёт по аниматору</Text>
            </TouchableOpacity>

            {status !== "blocked" ? (
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.danger, marginTop: 10 }]}
                onPress={remove}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.danger }]}>
                  Заблокировать
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
          onPress={isEdit ? update : create}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {isEdit ? "Сохранить изменения" : "Добавить аниматора"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
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
  statusRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg,
  },
  statusBtnActive: { backgroundColor: colors.primary },
  statusText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  statusTextActive: { color: "#fff" },
  secondaryBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});