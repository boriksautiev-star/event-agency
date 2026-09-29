import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AnimatorOrdersScreen } from "./AnimatorOrdersScreen";
import { AnimatorOrderDetailScreen } from "./AnimatorOrderDetailScreen";
import { colors } from "../../theme/colors";

export type AnimatorOrdersStackParamList = {
  OrdersList: undefined;
  OrderDetail: { orderId: string };
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
    </Stack.Navigator>
  );
}