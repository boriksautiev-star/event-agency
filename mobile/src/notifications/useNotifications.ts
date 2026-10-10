import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { navigateToOrder } from "../navigation/navigationRef";

// Как показывать уведомления, когда приложение открыто
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  // На Android создаём канал — без него не появится запрос разрешения (Android 13+)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Основные уведомления",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#667eea",
    });
  }

  // Проверяем/запрашиваем разрешение
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.warn("[push] Permission not granted");
    return null;
  }

  // Получаем projectId из app.json (нужен для ExpoPushToken)
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;
  if (!projectId) {
    console.warn("[push] projectId not found. Run `eas init` first.");
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("[push] ExpoPushToken:", token);
    return token;
  } catch (e) {
    console.warn("[push] Failed to get token:", e);
    return null;
  }
}

export function useNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener =
    useRef<Notifications.EventSubscription | null>(null);
  const responseListener =
    useRef<Notifications.EventSubscription | null>(null);

  // Регистрация токена и отправка на сервер
  useEffect(() => {
    if (!user) return;

    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token) return;
      setExpoPushToken(token);

      try {
        await api.patch(`/api/users/${user.id}/push-token`, {
          expoPushToken: token,
        });
        console.log("[push] Token saved to server");
      } catch (e) {
        console.warn("[push] Failed to save token:", e);
      }
    })();
  }, [user]);

  // Слушатели
  // userRef для актуального пользователя внутри listener
  const userRef = useRef(user);
  userRef.current = user;

  // orderId, который ждёт логина/готовности навигатора
  const pendingOrderIdRef = useRef<string | null>(null);

  const handleResponse = (data: any) => {
    const oid = typeof data?.orderId === "string" ? data.orderId : null;
    if (!oid) return;
    console.log("[push] tap -> orderId:", oid);
    if (userRef.current) {
      setTimeout(() => navigateToOrder(oid), 100);
    } else {
      pendingOrderIdRef.current = oid;
    }
  };

  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("[push] Received (foreground):", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        handleResponse(data);
      });

    // Холодный старт: приложение было закрыто, пользователь тапнул push
    (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last) {
          handleResponse(last.notification.request.content.data);
          await Notifications.clearLastNotificationResponseAsync();
        }
      } catch (e) {
        console.warn("[push] getLastNotificationResponse failed:", e);
      }
    })();

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  // Когда user появился после логина и есть pendingOrderId - навигируем
  useEffect(() => {
    if (!user) return;
    const oid = pendingOrderIdRef.current;
    if (!oid) return;
    pendingOrderIdRef.current = null;
    setTimeout(() => navigateToOrder(oid), 400);
  }, [user]);

  return { expoPushToken };
}