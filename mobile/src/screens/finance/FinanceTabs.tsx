import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { FinanceOverviewScreen } from "./FinanceOverviewScreen";
import { FinancePayoutsScreen } from "./FinancePayoutsScreen";
import { FinanceExpensesScreen } from "./FinanceExpensesScreen";
import { FinancePaymentsScreen } from "./FinancePaymentsScreen";
import { colors } from "../../theme/colors";

const Tab = createMaterialTopTabNavigator();

export function FinanceTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600", textTransform: "none" },
        tabBarIndicatorStyle: { backgroundColor: colors.primary },
        tabBarStyle: { backgroundColor: colors.card },
      }}
    >
      <Tab.Screen name="Overview" component={FinanceOverviewScreen} options={{ title: "Обзор" }} />
      <Tab.Screen name="Payouts" component={FinancePayoutsScreen} options={{ title: "Выплаты" }} />
      <Tab.Screen name="Expenses" component={FinanceExpensesScreen} options={{ title: "Расходы" }} />
      <Tab.Screen name="Payments" component={FinancePaymentsScreen} options={{ title: "Поступления" }} />
    </Tab.Navigator>
  );
}