import { describe, it, expect, beforeEach } from "vitest";
import { useFilterStore } from "@/context/filterStore";
import { useAuthStore } from "@/context/authStoreV2";
import { useNotificationStore } from "@/context/notificationStore";

describe("useFilterStore", () => {
  beforeEach(() => {
    useFilterStore.setState({
      minPrice: "",
      maxPrice: "",
      condition: [],
    });
  });

  it("updates minPrice and maxPrice", () => {
    useFilterStore.getState().setMinPrice("15");
    useFilterStore.getState().setMaxPrice("80");

    expect(useFilterStore.getState().minPrice).toBe("15");
    expect(useFilterStore.getState().maxPrice).toBe("80");
  });

  it("updates condition with direct array", () => {
    useFilterStore.getState().setCondition(["Brand new", "Like new"]);
    expect(useFilterStore.getState().condition).toEqual(["Brand new", "Like new"]);
  });

  it("updates condition with updater function", () => {
    useFilterStore.getState().setCondition(["Brand new"]);
    useFilterStore.getState().setCondition((prev) => [...prev, "Well used"]);
    expect(useFilterStore.getState().condition).toEqual(["Brand new", "Well used"]);
  });
});

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, userID: null });
  });

  it("sets and clears auth state properly", () => {
    useAuthStore.getState().setAuth("my-test-jwt", "user-42");
    expect(useAuthStore.getState().token).toBe("my-test-jwt");
    expect(useAuthStore.getState().userID).toBe("user-42");

    useAuthStore.getState().setAuth(null, null);
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().userID).toBeNull();
  });
});

describe("useNotificationStore", () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
  });

  it("adds notifications and tracks unread count", () => {
    useNotificationStore.getState().addNotification({
      type: "price_drop",
      title: "Price drop!",
      message: "An item in your wishlist dropped in price.",
    });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
    expect(state.notifications[0].title).toBe("Price drop!");
    expect(state.notifications[0].read).toBe(false);
  });

  it("marks all notifications as read", () => {
    useNotificationStore.getState().addNotification({
      type: "message",
      title: "New chat",
      message: "You got a message",
    });
    useNotificationStore.getState().addNotification({
      type: "cart_deleted",
      title: "Item removed",
      message: "Item removed from cart",
    });

    expect(useNotificationStore.getState().unreadCount).toBe(2);

    useNotificationStore.getState().markAllRead();

    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(useNotificationStore.getState().notifications.every((n) => n.read)).toBe(true);
  });
});
