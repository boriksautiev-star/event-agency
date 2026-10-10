import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../theme/colors";
import type { HandoverRequest, HandoverStatus } from "../api/handover";

const STATUS_LABELS: Record<HandoverStatus, string> = {
  pending_receiver: "Ждёт ответа получателя",
  pending_approval: "Ждёт подтверждения руководителя",
  approved: "Передача подтверждена",
  rejected_by_receiver: "Отклонена получателем",
  rejected_by_admin: "Отклонена руководителем",
  cancelled: "Отозвана",
};

const STATUS_COLORS: Record<HandoverStatus, string> = {
  pending_receiver: colors.warning,
  pending_approval: "#0ea5e9",
  approved: colors.success,
  rejected_by_receiver: colors.danger,
  rejected_by_admin: colors.danger,
  cancelled: colors.textMuted,
};

type Props = {
  item: HandoverRequest;
  perspective: "incoming" | "outgoing";
  onPress?: () => void;
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HandoverCard({ item, perspective, onPress }: Props) {
  const char = item.slot?.character?.name ?? item.slot?.characterNameSnapshot ?? "";
  const other = perspective === "incoming" ? item.fromAnimator : item.toAnimator;
  const label = perspective === "incoming" ? "От кого" : "Кому";

  const statusLabel = STATUS_LABELS[item.status];
  const statusColor = STATUS_COLORS[item.status];

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
      style={[styles.card, { borderLeftColor: statusColor }]}
    >
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>
            {item.order.title}
          </Text>
          <Text style={styles.meta}>
            {new Date(item.order.eventDate).toLocaleDateString("ru-RU")} ·{" "}
            {item.order.startTime}–{item.order.endTime}
          </Text>
          {char ? (
            <Text style={styles.meta}>
              {char} · {item.slot?.rateDurationMinutes ?? 0} мин
            </Text>
          ) : null}
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>
          {other.firstName} {other.lastName}
          {other.phone ? ` · ${other.phone}` : ""}
        </Text>
      </View>

      {item.comment ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Комментарий</Text>
          <Text style={[styles.rowValue, styles.italic]} numberOfLines={3}>
            «{item.comment}»
          </Text>
        </View>
      ) : null}

      {item.status === "rejected_by_receiver" || item.status === "rejected_by_admin" ? (
        item.rejectComment ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Причина отказа</Text>
            <Text style={[styles.rowValue, styles.italic, { color: colors.danger }]}>
              {item.rejectComment}
            </Text>
          </View>
        ) : null
      ) : null}

      <Text style={styles.date}>
        Создана: {fmtDateTime(item.requestedAt)}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  top: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  row: { flexDirection: "row", paddingVertical: 3, gap: 8 },
  rowLabel: { fontSize: 12, color: colors.textMuted, width: 90 },
  rowValue: { fontSize: 13, color: colors.text, flex: 1, fontWeight: "600" },
  italic: { fontStyle: "italic", fontWeight: "400" },
  date: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
});
