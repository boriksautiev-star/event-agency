import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchSettings, AgencySettings } from "../../api/settings";
import { colors } from "../../theme/colors";

export function AboutAgencyScreen() {
  const [data, setData] = useState<AgencySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSettings()
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e: any) => {
        if (!cancelled)
          setError(
            e?.response?.data?.error ?? "Не удалось загрузить информацию",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Нет данных"}</Text>
      </View>
    );
  }

  const phone = data.phone?.trim() || null;
  const email = data.email?.trim() || null;
  const website = data.website?.trim() || null;

  const phoneLink = phone ? phone.replace(/[^+\d]/g, "") : null;
  const websiteLink = website
    ? website.startsWith("http")
      ? website
      : `https://${website}`
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.card}>
        <Text style={styles.name}>{data.name || "Event Agency"}</Text>
        {data.legalName ? (
          <Text style={styles.legal}>{data.legalName}</Text>
        ) : null}
        {data.inn ? (
          <Text style={styles.meta}>ИНН: {data.inn}</Text>
        ) : null}
      </View>

      {(phone || email || data.address || website) ? (
        <View style={styles.card}>
          <Text style={styles.section}>Контакты</Text>

          {phone ? (
            <TouchableOpacity
              onPress={() => {
                if (phoneLink) Linking.openURL(`tel:${phoneLink}`);
              }}
            >
              <View style={styles.row}>
                <Text style={styles.label}>Телефон</Text>
                <Text style={styles.valueLink}>{phone}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {email ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${email}`)}
            >
              <View style={styles.row}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.valueLink}>{email}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {data.address ? (
            <View style={styles.row}>
              <Text style={styles.label}>Адрес</Text>
              <Text style={styles.value}>{data.address}</Text>
            </View>
          ) : null}

          {website && websiteLink ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(websiteLink)}
            >
              <View style={styles.row}>
                <Text style={styles.label}>Сайт</Text>
                <Text style={styles.valueLink}>{website}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {data.paymentDetails ? (
        <View style={styles.card}>
          <Text style={styles.section}>Реквизиты для оплат</Text>
          <Text style={styles.paymentDetails}>{data.paymentDetails}</Text>
        </View>
      ) : null}

      <Text style={styles.footer}>
        Часовой пояс: {data.timezone} · Валюта: {data.currency}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
    padding: 24,
  },
  error: { color: colors.danger, fontSize: 14, textAlign: "center" },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16 },
  name: { fontSize: 22, fontWeight: "700", color: colors.text },
  legal: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  section: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 6,
    gap: 12,
  },
  label: { fontSize: 13, color: colors.textMuted },
  value: { fontSize: 14, color: colors.text, flex: 1, textAlign: "right" },
  valueLink: {
    fontSize: 14,
    color: colors.primary,
    flex: 1,
    textAlign: "right",
    textDecorationLine: "underline",
  },
  paymentDetails: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  footer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
  },
});
