import type { OrderStatus } from "../api/types";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "alert" | "accent" | "outline";

export const ORDER_STATUS_BADGE: Record<OrderStatus, BadgeVariant> = {
  new: "default",
  confirmed: "primary",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};
