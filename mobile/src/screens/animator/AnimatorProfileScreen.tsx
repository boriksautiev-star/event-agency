import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { colors } from "../../theme/colors";

export function AnimatorProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.role}>Роль: {user?.role}</Text>
        <Text style={styles.meta}>Телефон: {user?.phone}</Text>
        {user?.email ? <Text style={styles.meta}>Email: {user.email}</Text> : null}
      </View>

      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Выйти</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16 },
  name: { fontSize: 20, fontWeight: "700", color: colors.text },
  role: { fontSize: 14, color: colors.primary, marginTop: 4 },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  button: {
    marginTop: 24,
    backgroundColor: colors.danger,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});