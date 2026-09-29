import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { StaffOrdersStack } from "../screens/staff/StaffOrdersStack";
import { StaffClientsStack } from "../screens/staff/StaffClientsStack";
import { StaffAnimatorsStack } from "../screens/staff/StaffAnimatorsStack";
import { FinanceTabs } from "../screens/finance/FinanceTabs";
import { colors } from "../theme/colors";
import { useAuth } from "../auth/AuthContext";
import { AnimatorProfileScreen } from "../screens/animator/AnimatorProfileScreen";

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{label}</Text>;
}

export function StaffTabs() {
  const { user } = useAuth();
  const isDirector = user?.role === "director";

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
        component={StaffOrdersStack}
        options={{
          title: "Заказы",
          tabBarLabel: "Заказы",
          tabBarIcon: ({ focused }) => <TabIcon label="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ClientsTab"
        component={StaffClientsStack}
        options={{
          title: "Клиенты",
          tabBarLabel: "Клиенты",
          tabBarIcon: ({ focused }) => <TabIcon label="👥" focused={focused} />,
        }}
      />
      {isDirector ? (
        <Tab.Screen
          name="AnimatorsTab"
          component={StaffAnimatorsStack}
          options={{
            title: "Аниматоры",
            tabBarLabel: "Аниматоры",
            tabBarIcon: ({ focused }) => <TabIcon label="🎭" focused={focused} />,
          }}
        />
      ) : null}
      {isDirector ? (
        <Tab.Screen
          name="FinanceTab"
          component={FinanceTabs}
          options={{
            title: "Финансы",
            tabBarLabel: "Финансы",
            headerShown: true,
            headerStyle: { backgroundColor: colors.card },
            headerTitleStyle: { color: colors.text },
            headerTitle: "Финансы",
            tabBarIcon: ({ focused }) => <TabIcon label="💰" focused={focused} />,
          }}
        />
      ) : null}
      <Tab.Screen
        name="Profile"
        component={AnimatorProfileScreen}
        options={{
          title: "Профиль",
          headerShown: true,
          tabBarLabel: "Профиль",
          tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}