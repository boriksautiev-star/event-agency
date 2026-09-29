import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { colors } from "../theme/colors";

export function HomePlaceholder() {
  const { user, logout } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Привет, {user?.firstName}!</Text>
      <Text style={styles.role}>Роль: {user?.role}</Text>
      <Text style={styles.muted}>Здесь будет основной экран для роли.</Text>
      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Выйти</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: 20 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  role: { fontSize: 16, color: colors.primary, marginTop: 8 },
  muted: { fontSize: 14, color: colors.textMuted, marginTop: 12, textAlign: "center" },
  button: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});