import { describe, it, expect, beforeEach } from "vitest";
import {
  readCartSnapshot,
  syncCartSnapshot,
  rememberCartItem,
  forgetCartItem,
} from "@/lib/cartNotifications";
import { useNotificationStore } from "@/context/notificationStore";
import type { CartItem } from "@/types";

describe("cartNotifications", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
  });

  const makeCartItem = (id: string, title: string, price: number, quantity = 1): CartItem => ({
    quantity,
    listing: {
      id,
      title,
      price,
      quantity,
      sellerID: "seller-1",
      description: "Sample",
      condition: "Brand new",
      categoryName: "Tech",
      createdOn: "2026-10-01",
      score: 1,
      images: [],
    },
  });

  it("remembers and forgets individual cart items in localStorage", () => {
    const item = makeCartItem("item-1", "Headphones", 100);
    rememberCartItem(item);

    let snapshot = readCartSnapshot();
    expect(snapshot["item-1"]).toEqual({
      listingID: "item-1",
      title: "Headphones",
      price: 100,
      quantity: 1,
    });

    forgetCartItem("item-1");
    snapshot = readCartSnapshot();
    expect(snapshot["item-1"]).toBeUndefined();
  });

  it("detects price drops and creates notification", () => {
    const initialItem = makeCartItem("item-2", "Gaming Mouse", 80);
    rememberCartItem(initialItem);

    // Sync with lowered price
    const discountedItem = makeCartItem("item-2", "Gaming Mouse", 55);
    const cartMap = new Map<string, CartItem>();
    cartMap.set("item-2", discountedItem);

    syncCartSnapshot(cartMap);

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("price_drop");
    expect(notifications[0].title).toBe("Price drop detected");
    expect(notifications[0].message).toContain("dropped from $80 to $55");
  });

  it("detects removed items during sync and creates cart_deleted notification", () => {
    const itemA = makeCartItem("item-a", "Keyboard", 120);
    rememberCartItem(itemA);

    // Sync with empty cart
    syncCartSnapshot(new Map<string, CartItem>());

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("cart_deleted");
    expect(notifications[0].message).toContain("Keyboard was removed from your cart.");
  });
});
