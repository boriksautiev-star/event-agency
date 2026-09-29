import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { StaffAnimatorsScreen } from "./StaffAnimatorsScreen";
import { CharactersScreen } from "./CharactersScreen";
import { RateGroupsScreen } from "./RateGroupsScreen";
import { colors } from "../../theme/colors";

const Tab = createMaterialTopTabNavigator();

export function StaffAnimatorsTabs() {
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
      <Tab.Screen
        name="Animators"
        component={StaffAnimatorsScreen}
        options={{ title: "Аниматоры" }}
      />
      <Tab.Screen
        name="Characters"
        component={CharactersScreen}
        options={{ title: "Персонажи" }}
      />
      <Tab.Screen
        name="Groups"
        component={RateGroupsScreen}
        options={{ title: "Группы" }}
      />
    </Tab.Navigator>
  );
}