import { File, Directory, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform, Alert } from "react-native";
import { API_URL } from "../config/env";
import { tokenStore } from "../api/client";

/**
 * Скачивает Excel-файл (.xlsx) с бэкенда и открывает системное меню «Поделиться».
 * filename приходит БЕЗ расширения — функция сама добавит .xlsx.
 */
export async function downloadAndShareExcel(
  path: string,
  filename: string,
): Promise<void> {
  try {
    const token = await tokenStore.getAccess();
    const sep = path.includes("?") ? "&" : "?";
    const url = `${API_URL}${path}${sep}format=xlsx&_t=${Date.now()}`;
    console.log("[export] downloading", url);

    const exportsDir = new Directory(Paths.cache, "exports");
    if (!exportsDir.exists) exportsDir.create();

    const base = filename.replace(/\.(csv|xlsx)$/i, "");
    const fullName = `${base}.xlsx`;
    const destination = new File(exportsDir, fullName);

    // Удаляем старый файл, если он уже есть — иначе downloadFileAsync упадёт
    if (destination.exists) {
      try {
        destination.delete();
      } catch (e) {
        console.warn("[export] failed to delete existing file:", e);
      }
    }

    const file = await File.downloadFileAsync(url, destination, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    console.log("[export] saved", file.uri);

    if (Platform.OS === "web") {
      Alert.alert("Готово", "Файл сохранён");
      return;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("Недоступно", "Системное меню «Поделиться» недоступно");
      return;
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: fullName,
      UTI: "org.openxmlformats.spreadsheetml.sheet",
    });
  } catch (e: any) {
    console.warn("[export] failed:", e);
    Alert.alert("Ошибка экспорта", String(e?.message ?? e));
  }
}

export const downloadAndShareCSV = downloadAndShareExcel;