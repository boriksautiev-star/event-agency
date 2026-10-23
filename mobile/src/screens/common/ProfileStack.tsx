import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AnimatorProfileScreen } from "../animator/AnimatorProfileScreen";
import { AboutAgencyScreen } from "./AboutAgencyScreen";
import { NotificationSettingsScreen } from "./NotificationSettingsScreen";
import { colors } from "../../theme/colors";

export type ProfileStackParamList = {
  ProfileMain: undefined;
  AboutAgency: undefined;
  NotificationSettings: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={AnimatorProfileScreen}
        options={{ title: "Профиль" }}
      />
      <Stack.Screen
        name="AboutAgency"
        component={AboutAgencyScreen}
        options={{ title: "О агентстве" }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: "Уведомления" }}
      />
    </Stack.Navigator>
  );
}
