import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../api/client";
import type { ListResponse } from "../../api/types";
import { colors } from "../../theme/colors";
import type { StaffClientsStackParamList } from "./StaffClientsStack";

type Nav = NativeStackNavigationProp<StaffClientsStackParamList, "ClientsList">;

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
};

export function StaffClientsScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async (query?: string) => {
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : "";
      const { data } = await api.get<ListResponse<Client>>(`/api/clients${params}`);
      setItems(data.items);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить клиентов");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(search || undefined);
    }, [load, search]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(search || undefined);
  };

  const onSubmitSearch = () => {
    setLoading(true);
    load(search.trim() || undefined);
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
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по имени, телефону, email"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={onSubmitSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={onSubmitSearch}>
          <Text style={styles.searchBtnText}>Найти</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.muted}>Пока нет клиентов</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("ClientDetail", { clientId: item.id })}
            style={styles.card}
          >
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
            {item.email ? <Text style={styles.meta}>{item.email}</Text> : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
  searchBox: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 10,
  },
  searchBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  phone: { fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: "600" },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});