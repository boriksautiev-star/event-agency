import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchMyIncoming, HandoverRequest } from "../../api/handover";
import { colors } from "../../theme/colors";
import { HandoverCard } from "../../components/HandoverCard";
import type { AnimatorOrdersStackParamList } from "./AnimatorOrdersStack";

type Nav = NativeStackNavigationProp<AnimatorOrdersStackParamList, "HandoverInbox">;

export function HandoverInboxScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<HandoverRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchMyIncoming();
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(x) => x.id}
      contentContainerStyle={{ padding: 12 }}
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
          <Text style={styles.muted}>Входящих заявок нет</Text>
        </View>
      }
      renderItem={({ item }) => (
        <HandoverCard
          item={item}
          perspective="incoming"
          onPress={() =>
            navigation.navigate("HandoverDetail", { requestId: item.id })
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
});
