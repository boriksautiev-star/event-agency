import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DashboardScreen } from "./DashboardScreen";
import { StaffOrderDetailScreen } from "../staff/StaffOrderDetailScreen";
import { StaffOrderEditScreen } from "../staff/StaffOrderEditScreen";
import { HandoverPendingScreen } from "../staff/HandoverPendingScreen";
import { HandoverDetailScreen } from "../animator/HandoverDetailScreen";
import { colors } from "../../theme/colors";

export type DashboardStackParamList = {
  DashboardHome: undefined;
  OrderDetail: { orderId: string };
  OrderEdit: { orderId: string };
  HandoverPending: undefined;
  HandoverDetail: { requestId: string };
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={StaffOrderDetailScreen}
        options={{ title: "Заказ" }}
      />
      <Stack.Screen
        name="OrderEdit"
        component={StaffOrderEditScreen}
        options={{ title: "Редактирование" }}
      />
      <Stack.Screen
        name="HandoverPending"
        component={HandoverPendingScreen}
        options={{ title: "Заявки на передачу" }}
      />
      <Stack.Screen
        name="HandoverDetail"
        component={HandoverDetailScreen}
        options={{ title: "Заявка на передачу" }}
      />
    </Stack.Navigator>
  );
}
