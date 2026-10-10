import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { AnimatorOrdersStack } from "../screens/animator/AnimatorOrdersStack";
import { AnimatorReportStack } from "../screens/animator/AnimatorReportStack";
import { ProfileStack } from "../screens/common/ProfileStack";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{label}</Text>;
}

export function AnimatorTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="OrdersTab"
        component={AnimatorOrdersStack}
        options={{
          title: "Мои заказы",
          tabBarLabel: "Заказы",
          tabBarIcon: ({ focused }) => <TabIcon label="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Report"
        component={AnimatorReportStack}
        options={{
          title: "Отчёты",
          tabBarLabel: "Отчёты",
          tabBarIcon: ({ focused }) => <TabIcon label="📊" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: "Профиль",
          headerShown: false,
          tabBarLabel: "Профиль",
          tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}