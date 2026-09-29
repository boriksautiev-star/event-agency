import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity, Text } from "react-native";
import { StaffOrdersScreen } from "./StaffOrdersScreen";
import { StaffOrderDetailScreen } from "./StaffOrderDetailScreen";
import { StaffOrderCreateScreen } from "./StaffOrderCreateScreen";
import { StaffOrderEditScreen } from "./StaffOrderEditScreen";
import { ClientPickerScreen } from "./ClientPickerScreen";
import { colors } from "../../theme/colors";
import type { Client } from "./StaffClientsScreen";

export type StaffOrdersStackParamList = {
  OrdersList: undefined;
  OrderDetail: { orderId: string };
  OrderCreate: { pickedClient?: Client } | undefined;
  OrderEdit: { orderId: string };
  ClientPicker: undefined;
};

const Stack = createNativeStackNavigator<StaffOrdersStackParamList>();

export function StaffOrdersStack() {
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
        component={StaffOrdersScreen}
        options={({ navigation }) => ({
          title: "Заказы",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate("OrderCreate")}
              style={{ paddingHorizontal: 8 }}
            >
              <Text style={{ fontSize: 28, color: colors.primary, lineHeight: 28 }}>+</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="OrderDetail"
        component={StaffOrderDetailScreen}
        options={{ title: "Заказ" }}
      />
      <Stack.Screen
        name="OrderCreate"
        component={StaffOrderCreateScreen}
        options={{ title: "Новый заказ" }}
      />
      <Stack.Screen
        name="OrderEdit"
        component={StaffOrderEditScreen}
        options={{ title: "Редактирование" }}
      />
      <Stack.Screen
        name="ClientPicker"
        component={ClientPickerScreen}
        options={{ title: "Выбор клиента" }}
      />
    </Stack.Navigator>
  );
}