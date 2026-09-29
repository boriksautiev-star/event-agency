import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StaffClientsScreen } from "./StaffClientsScreen";
import { StaffClientDetailScreen } from "./StaffClientDetailScreen";
import { colors } from "../../theme/colors";

export type StaffClientsStackParamList = {
  ClientsList: undefined;
  ClientDetail: { clientId: string };
};

const Stack = createNativeStackNavigator<StaffClientsStackParamList>();

export function StaffClientsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen
        name="ClientsList"
        component={StaffClientsScreen}
        options={{ title: "Клиенты" }}
      />
      <Stack.Screen
        name="ClientDetail"
        component={StaffClientDetailScreen}
        options={{ title: "Клиент" }}
      />
    </Stack.Navigator>
  );
}