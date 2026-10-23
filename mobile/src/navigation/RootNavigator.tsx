import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { ServerSetupScreen } from "../screens/auth/ServerSetupScreen";
import { RoleRouter } from "./RoleRouter";
import { navigationRef } from "./navigationRef";
import { colors } from "../theme/colors";

export function RootNavigator() {
  const { user, loading, serverUrl, serverLoading } = useAuth();

  if (loading || serverLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!serverUrl) {
    return <ServerSetupScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <RoleRouter /> : <LoginScreen />}
    </NavigationContainer>
  );
}