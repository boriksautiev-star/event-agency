import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../api/client";
import type { ListResponse } from "../../api/types";
import { colors } from "../../theme/colors";
import type { StaffOrdersStackParamList } from "./StaffOrdersStack";
import type { Client } from "./StaffClientsScreen";

type Nav = NativeStackNavigationProp<StaffOrdersStackParamList, "ClientPicker">;

export function ClientPickerScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = q.trim()
        ? `?search=${encodeURIComponent(q.trim())}&limit=200`
        : "?limit=200";
      const { data } = await api.get<ListResponse<Client>>(`/api/clients${params}`);
      setItems(data.items);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить клиентов");
    } finally {
      setLoading(false);
    }
  }, []);

  // Дебаунс поиска
  useEffect(() => {
    const t = setTimeout(() => {
      load(search);
    }, 250);
    return () => clearTimeout(t);
  }, [search, load]);

  const pick = (c: Client) => {
    navigation.navigate("OrderCreate", { pickedClient: c });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по имени, телефону, email"
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>Ничего не найдено</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => pick(item)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.phone}>{item.phone}</Text>
                {item.email ? <Text style={styles.email}>{item.email}</Text> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearText: { fontSize: 16, color: colors.textMuted },
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  phone: { fontSize: 13, color: colors.primary, marginTop: 4, fontWeight: "600" },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});