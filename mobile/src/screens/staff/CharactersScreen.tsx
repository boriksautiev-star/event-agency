import React, { useCallback, useMemo, useState } from "react";
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
import type { Character, RateGroup } from "../../api/types";
import { colors } from "../../theme/colors";
import type { StaffAnimatorsStackParamList } from "./StaffAnimatorsStack";

type Nav = NativeStackNavigationProp<StaffAnimatorsStackParamList>;

export function CharactersScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Character[]>([]);
  const [groups, setGroups] = useState<RateGroup[]>([]);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [chRes, grRes] = await Promise.all([
        api.get<{ items: Character[] }>("/api/characters"),
        api.get<{ items: RateGroup[] }>("/api/rate-groups"),
      ]);
      setItems(chRes.data.items);
      setGroups(grRes.data.items);
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

  const filtered = useMemo(() => {
    let list = items;
    if (groupFilter) list = list.filter((x) => x.rateGroupId === groupFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((x) => x.name.toLowerCase().includes(q));
    return list;
  }, [items, search, groupFilter]);

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
          placeholder="Поиск персонажа"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterChip, !groupFilter && styles.filterChipActive]}
          onPress={() => setGroupFilter(null)}
        >
          <Text style={[styles.filterText, !groupFilter && styles.filterTextActive]}>
            Все ({items.length})
          </Text>
        </TouchableOpacity>
        {groups.map((g) => {
          const count = items.filter((x) => x.rateGroupId === g.id).length;
          return (
            <TouchableOpacity
              key={g.id}
              style={[styles.filterChip, groupFilter === g.id && styles.filterChipActive]}
              onPress={() => setGroupFilter(groupFilter === g.id ? null : g.id)}
            >
              <Text
                style={[
                  styles.filterText,
                  groupFilter === g.id && styles.filterTextActive,
                ]}
              >
                {g.name} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
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
            <Text style={styles.muted}>Персонажей не найдено</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.card, !item.isActive && { opacity: 0.5 }]}
            onPress={() => navigation.navigate("CharacterForm", { characterId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.rateGroup?.name ?? "—"}</Text>
            </View>
            {!item.isActive ? (
              <View style={styles.badgeOff}>
                <Text style={styles.badgeOffText}>выкл</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CharacterForm", {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
  searchBox: {
    padding: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.bg,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 12, color: colors.text, fontWeight: "600" },
  filterTextActive: { color: "#fff" },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  badgeOff: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeOffText: { fontSize: 11, color: colors.textMuted, fontWeight: "700" },
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