import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AnimatorOrdersScreen } from "./AnimatorOrdersScreen";
import { AnimatorOrderDetailScreen } from "./AnimatorOrderDetailScreen";
import { HandoverDetailScreen } from "./HandoverDetailScreen";
import { HandoverInboxScreen } from "./HandoverInboxScreen";
import { HandoverOutgoingScreen } from "./HandoverOutgoingScreen";
import { colors } from "../../theme/colors";

export type AnimatorOrdersStackParamList = {
  OrdersList: undefined;
  OrderDetail: { orderId: string };
  HandoverDetail: { requestId: string };
  HandoverInbox: undefined;
  HandoverOutgoing: undefined;
};

const Stack = createNativeStackNavigator<AnimatorOrdersStackParamList>();

export function AnimatorOrdersStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen
        name="OrdersList"
        component={AnimatorOrdersScreen}
        options={{ title: "Мои заказы" }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={AnimatorOrderDetailScreen}
        options={{ title: "Заказ" }}
      />
      <Stack.Screen
        name="HandoverDetail"
        component={HandoverDetailScreen}
        options={{ title: "Заявка на передачу" }}
      />
      <Stack.Screen
        name="HandoverInbox"
        component={HandoverInboxScreen}
        options={{ title: "Входящие заявки" }}
      />
      <Stack.Screen
        name="HandoverOutgoing"
        component={HandoverOutgoingScreen}
        options={{ title: "Мои заявки" }}
      />
    </Stack.Navigator>
  );
}