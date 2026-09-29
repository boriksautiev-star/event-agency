import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../api/client";
import type { ListResponse, User } from "../../api/types";
import { colors } from "../../theme/colors";
import type { StaffAnimatorsStackParamList } from "./StaffAnimatorsStack";

type Nav = NativeStackNavigationProp<StaffAnimatorsStackParamList>;

const STATUS_LABELS: Record<string, string> = {
  active: "Активен",
  blocked: "Заблокирован",
  invited: "Приглашён",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  blocked: "#dc2626",
  invited: "#f59e0b",
};

export function StaffAnimatorsScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (q?: string) => {
    try {
      const params = new URLSearchParams();
      params.set("role", "animator");
      if (q) params.set("search", q);
      const { data } = await api.get<ListResponse<User>>(`/api/users?${params.toString()}`);
      setItems(data.items);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(search.trim() || undefined);
    }, [load, search]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(search.trim() || undefined);
  };

  const submitSearch = () => {
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
          placeholder="Поиск по имени или телефону"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={submitSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={submitSearch}>
          <Text style={styles.searchBtnText}>Найти</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.muted}>Аниматоров пока нет</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate("AnimatorForm", {})}
            >
              <Text style={styles.addBtnText}>+ Добавить аниматора</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.card}
            onPress={() => navigation.navigate("AnimatorForm", { animatorId: item.id })}
          >
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={styles.phone}>{item.phone}</Text>
                {item.email ? <Text style={styles.email}>{item.email}</Text> : null}
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: STATUS_COLORS[item.status] ?? colors.textMuted },
                ]}
              >
                <Text style={styles.badgeText}>
                  {STATUS_LABELS[item.status] ?? item.status}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AnimatorForm", {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14, marginBottom: 16 },
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
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  phone: { fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: "600" },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
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
});