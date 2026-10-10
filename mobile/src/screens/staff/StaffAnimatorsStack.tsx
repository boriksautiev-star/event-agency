import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StaffAnimatorsTabs } from "./StaffAnimatorsTabs";
import { StaffAnimatorFormScreen } from "./StaffAnimatorFormScreen";
import { CharacterFormScreen } from "./CharacterFormScreen";
import { RateMatrixScreen } from "./RateMatrixScreen";
import { AnimatorReportByIdScreen } from "./AnimatorReportByIdScreen";
import { colors } from "../../theme/colors";

export type StaffAnimatorsStackParamList = {
  AnimatorsTabs: undefined;
  AnimatorForm: { animatorId?: string };
  CharacterForm: { characterId?: string };
  RateMatrix: { animatorId: string; animatorName: string };
  AnimatorReport: { animatorId: string; animatorName: string };
};

const Stack = createNativeStackNavigator<StaffAnimatorsStackParamList>();

export function StaffAnimatorsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen
        name="AnimatorsTabs"
        component={StaffAnimatorsTabs}
        options={{ title: "Аниматоры" }}
      />
      <Stack.Screen
        name="AnimatorForm"
        component={StaffAnimatorFormScreen}
        options={{ title: "Аниматор" }}
      />
      <Stack.Screen
        name="CharacterForm"
        component={CharacterFormScreen}
        options={{ title: "Персонаж" }}
      />
      <Stack.Screen
        name="RateMatrix"
        component={RateMatrixScreen}
        options={{ title: "Ставки" }}
      />
      <Stack.Screen
        name="AnimatorReport"
        component={AnimatorReportByIdScreen}
        options={{ title: "Отчёт" }}
      />
    </Stack.Navigator>
  );
}