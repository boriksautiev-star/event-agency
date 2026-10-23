import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { testServerUrl } from "../../config/serverConfig";
import { colors } from "../../theme/colors";

export function ServerSetupScreen() {
  const { setServerUrl } = useAuth();
  const [url, setUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const onTest = async () => {
    setTestResult(null);
    setTesting(true);
    const r = await testServerUrl(url);
    setTestResult(r);
    setTesting(false);
  };

  const onContinue = async () => {
    const normalized = url.trim().replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(normalized)) {
      Alert.alert("Ошибка", "URL должен начинаться с http:// или https://");
      return;
    }
    setSaving(true);
    try {
      await setServerUrl(normalized);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Подключение к серверу</Text>
          <Text style={styles.hint}>
            Введите адрес сервера вашего агентства. Обычно его сообщает администратор.
          </Text>

          <Text style={styles.label}>Адрес сервера</Text>
          <TextInput
            style={styles.input}
            placeholder="https://agency-ivanov.ru"
            placeholderTextColor={colors.textMuted}
            value={url}
            onChangeText={(t) => { setUrl(t); setTestResult(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <TouchableOpacity
            style={[styles.testBtn, testing && styles.disabled]}
            onPress={onTest}
            disabled={testing || !url.trim()}
          >
            {testing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.testBtnText}>Проверить подключение</Text>
            )}
          </TouchableOpacity>

          {testResult && (
            <View style={[styles.result, { backgroundColor: testResult.ok ? "#ecfdf5" : "#fef2f2" }]}>
              <Text style={{ color: testResult.ok ? colors.success : colors.danger, fontSize: 13 }}>
                {testResult.ok ? "✅ Подключение успешно" : `❌ ${testResult.error}`}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.continueBtn, (saving || !url.trim()) && styles.disabled]}
            onPress={onContinue}
            disabled={saving || !url.trim()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueBtnText}>Продолжить</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 20 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: 20, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
    marginBottom: 12,
  },
  testBtn: {
    paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.primary,
    alignItems: "center", marginBottom: 12,
  },
  testBtnText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  result: { borderRadius: 8, padding: 10, marginBottom: 12 },
  continueBtn: {
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: "center",
  },
  continueBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  disabled: { opacity: 0.5 },
});
