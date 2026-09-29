import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AnimatorReportScreen } from "./AnimatorReportScreen";
import { AnimatorOrderDetailScreen } from "./AnimatorOrderDetailScreen";
import { colors } from "../../theme/colors";

export type AnimatorReportStackParamList = {
  ReportHome: undefined;
  OrderDetail: { orderId: string };
};

const Stack = createNativeStackNavigator<AnimatorReportStackParamList>();

export function AnimatorReportStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen
        name="ReportHome"
        component={AnimatorReportScreen}
        options={{ title: "Отчёты" }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={AnimatorOrderDetailScreen}
        options={{ title: "Заказ" }}
      />
    </Stack.Navigator>
  );
}