import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useFocusEffect, useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../api/client";
import type { ListResponse, Order } from "../../api/types";
import { colors } from "../../theme/colors";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "../../utils/labels";
import type { StaffClientsStackParamList } from "./StaffClientsStack";
import type { Client } from "./StaffClientsScreen";

type RouteT = RouteProp<StaffClientsStackParamList, "ClientDetail">;

export function StaffClientDetailScreen() {
  const route = useRoute<RouteT>();
  const navigation = useNavigation<any>();
  const { clientId } = route.params;
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [clientRes, ordersRes] = await Promise.all([
        api.get<{ client: Client }>(`/api/clients/${clientId}`),
        api.get<ListResponse<Order>>(`/api/orders?clientId=${clientId}&limit=200`),
      ]);
      setClient(clientRes.data.client);
      setOrders(ordersRes.data.items);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const callPhone = () => {
    if (!client?.phone) return;
    Linking.openURL(`tel:${client.phone}`);
  };

  const sendEmail = () => {
    if (!client?.email) return;
    Linking.openURL(`mailto:${client.email}`);
  };

  const openOrder = (orderId: string) => {
    navigation.getParent()?.navigate("OrdersTab", {
      screen: "OrderDetail",
      params: { orderId },
    });
  };

  const now = new Date();
  const upcoming = orders
    .filter((o) => new Date(o.eventDate) >= now)
    .sort((a, b) => +new Date(a.eventDate) - +new Date(b.eventDate));
  const past = orders
    .filter((o) => new Date(o.eventDate) < now)
    .sort((a, b) => +new Date(b.eventDate) - +new Date(a.eventDate));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Клиент не найден</Text>
      </View>
    );
  }

  const renderOrder = (o: Order) => (
    <TouchableOpacity
      key={o.id}
      activeOpacity={0.7}
      style={styles.orderCard}
      onPress={() => openOrder(o.id)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.orderTitle}>{o.title}</Text>
        <Text style={styles.orderMeta}>
          {new Date(o.eventDate).toLocaleDateString("ru-RU")} · {o.startTime}–{o.endTime}
        </Text>
      </View>
      <View
        style={[
          styles.badge,
          { backgroundColor: ORDER_STATUS_COLORS[o.status] ?? colors.textMuted },
        ]}
      >
        <Text style={styles.badgeText}>{ORDER_STATUS_LABELS[o.status] ?? o.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{client.name}</Text>
        <TouchableOpacity onPress={callPhone}>
          <Text style={styles.phone}>{client.phone}</Text>
        </TouchableOpacity>
        {client.email ? (
          <TouchableOpacity onPress={sendEmail}>
            <Text style={styles.email}>{client.email}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {client.address ? (
        <View style={styles.card}>
          <Text style={styles.section}>Адрес</Text>
          <Text style={styles.value}>{client.address}</Text>
        </View>
      ) : null}

      {client.notes ? (
        <View style={styles.card}>
          <Text style={styles.section}>Заметки</Text>
          <Text style={styles.value}>{client.notes}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.section}>Предстоящие заказы ({upcoming.length})</Text>
        {upcoming.length > 0 ? (
          upcoming.map(renderOrder)
        ) : (
          <Text style={styles.muted}>Нет предстоящих</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Прошедшие заказы ({past.length})</Text>
        {past.length > 0 ? (
          past.map(renderOrder)
        ) : (
          <Text style={styles.muted}>Нет прошедших</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>В базе с</Text>
        <Text style={styles.value}>
          {new Date(client.createdAt).toLocaleDateString("ru-RU")}
        </Text>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { color: colors.textMuted, fontSize: 14 },
  container: { padding: 12 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  phone: { fontSize: 15, color: colors.primary, marginTop: 6, fontWeight: "600" },
  email: { fontSize: 14, color: colors.primary, marginTop: 4 },
  section: { fontSize: 12, color: colors.textMuted, textTransform: "uppercase", marginBottom: 6 },
  value: { fontSize: 15, color: colors.text, marginTop: 2 },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  orderTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  orderMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
});