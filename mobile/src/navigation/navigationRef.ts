import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

const MAX_ATTEMPTS = 25;

export function navigateToOrder(orderId: string, attempt = 0) {
  if (!orderId) return;
  if (navigationRef.isReady()) {
    try {
      navigationRef.navigate("OrdersTab" as never, {
        screen: "OrderDetail",
        params: { orderId },
      } as never);
    } catch (e) {
      console.warn("[nav] navigateToOrder failed:", e);
    }
    return;
  }
  if (attempt < MAX_ATTEMPTS) {
    setTimeout(() => navigateToOrder(orderId, attempt + 1), 150);
  } else {
    console.warn("[nav] navigationRef not ready after retries, giving up");
  }
}
