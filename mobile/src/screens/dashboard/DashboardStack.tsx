import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DashboardScreen } from "./DashboardScreen";
import { StaffOrderDetailScreen } from "../staff/StaffOrderDetailScreen";
import { StaffOrderEditScreen } from "../staff/StaffOrderEditScreen";
import { colors } from "../../theme/colors";

export type DashboardStackParamList = {
  DashboardHome: undefined;
  OrderDetail: { orderId: string };
  OrderEdit: { orderId: string };
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
    </Stack.Navigator>
  );
}
