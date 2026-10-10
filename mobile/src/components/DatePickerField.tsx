import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { colors } from "../theme/colors";

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
};

function parseDate(s: string): Date {
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DatePickerField({ value, onChange, label = "Дата" }: Props) {
  const [showIos, setShowIos] = useState(false);

  const openAndroid = () => {
    // Всегда открываем календарь на текущей дате,
    // даже если в поле стоит другая.
    DateTimePickerAndroid.open({
      value: parseDate(value),
      mode: "date",
      display: "default",
      onChange: (event: DateTimePickerEvent, date?: Date) => {
        if (event.type === "set" && date) {
          onChange(formatISO(date));
        }
      },
    });
  };

  const onPress = () => {
    if (Platform.OS === "android") openAndroid();
    else setShowIos(true);
  };


  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.field} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.fieldText} numberOfLines={1}>
          {parseDate(value).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {Platform.OS === "ios" && showIos ? (
        <View style={styles.iosBox}>
          <DateTimePicker
            value={parseDate(value)}
            mode="date"
            display="spinner"
            onValueChange={(_: any, date: Date) => onChange(formatISO(date))}
          />
          <TouchableOpacity style={styles.doneBtn} onPress={() => setShowIos(false)}>
            <Text style={styles.doneText}>Готово</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: colors.textMuted, marginBottom: 4, marginTop: 8 },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  fieldText: { fontSize: 13, color: colors.text, flexShrink: 1 },
  icon: { fontSize: 14 },
  iosBox: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneBtn: { alignSelf: "flex-end", paddingHorizontal: 12, paddingVertical: 6 },
  doneText: { color: colors.primary, fontWeight: "600", fontSize: 15 },
});