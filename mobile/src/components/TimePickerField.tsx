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
  value: string; // HH:MM
  onChange: (value: string) => void;
  label?: string;
};

function parseTime(s: string): Date {
  const [h, m] = s.split(":").map((x) => Number(x));
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 12, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function formatTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function TimePickerField({ value, onChange, label = "Время" }: Props) {
  const [showIos, setShowIos] = useState(false);

  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value: parseTime(value),
      mode: "time",
      is24Hour: true,
      display: "clock",
      onChange: (event: DateTimePickerEvent, date?: Date) => {
        if (event.type === "set" && date) {
          onChange(formatTime(date));
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
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.fieldText}>{value}</Text>
        <Text style={styles.icon}>🕐</Text>
      </TouchableOpacity>

      {Platform.OS === "ios" && showIos ? (
        <View style={styles.iosBox}>
          <DateTimePicker
            value={parseTime(value)}
            mode="time"
            display="spinner"
            is24Hour
            onValueChange={(_: any, date: Date) => onChange(formatTime(date))}
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldText: { fontSize: 15, color: colors.text },
  icon: { fontSize: 18 },
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