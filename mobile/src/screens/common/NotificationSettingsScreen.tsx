import React, { useEffect, useState } from "react";
import {
  View, Text, Switch, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { colors } from "../../theme/colors";
import {
  fetchNotificationSettings, updateNotificationSettings, NotificationSetting,
} from "../../api/notificationSettings";

export function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotificationSettings()
      .then(setSettings)
      .catch(() => Alert.alert("Ошибка", "Не удалось загрузить настройки"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (eventType: string, val: boolean) => {
    const prev = [...settings];
    const next = settings.map((s) =>
      s.eventType === eventType ? { ...s, isEnabled: val } : s
    );
    setSettings(next);
    setSaving(true);
    try {
      await updateNotificationSettings(
        next.map((s) => ({ eventType: s.eventType, isEnabled: s.isEnabled }))
      );
    } catch {
      Alert.alert("Ошибка", "Не удалось сохранить настройку");
      setSettings(prev);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.hint}>
        Выберите, какие события присылать вам на устройство. Работает только для push-уведомлений.
      </Text>
      <View style={styles.card}>
        {settings.map((s, idx) => (
          <View key={s.eventType} style={[styles.row, idx > 0 && styles.rowBorder]}>
            <Text style={styles.label}>{s.label}</Text>
            <Switch
              value={s.isEnabled}
              onValueChange={(v) => toggle(s.eventType, v)}
              disabled={saving}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  label: { flex: 1, fontSize: 14, color: colors.text, marginRight: 12 },
});
