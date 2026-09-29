import React from "react";
import { useAuth } from "../auth/AuthContext";
import { AnimatorTabs } from "./AnimatorTabs";
import { StaffTabs } from "./StaffTabs";

export function RoleRouter() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "animator") {
    return <AnimatorTabs />;
  }

  // director / admin
  return <StaffTabs />;
}