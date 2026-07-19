import { useNotificationStore } from "@/context/notificationStore";
import type { CartItem } from "@/types";

const CART_SNAPSHOT_KEY = "orbital:cart-snapshot-v1";

export type CartSnapshotEntry = {
  listingID: string;
  title: string;
  price: number;
  quantity: number;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readRawSnapshot(): Record<string, CartSnapshotEntry> {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(CART_SNAPSHOT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CartSnapshotEntry>;
  } catch {
    return {};
  }
}

function writeRawSnapshot(snapshot: Record<string, CartSnapshotEntry>) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CART_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function toEntry(cartItem: CartItem): CartSnapshotEntry {
  return {
    listingID: cartItem.listing.id,
    title: cartItem.listing.title,
    price: cartItem.listing.price,
    quantity: cartItem.quantity,
  };
}

export function readCartSnapshot() {
  return readRawSnapshot();
}

export function syncCartSnapshot(cartItems: Map<string, CartItem>) {
  if (!canUseStorage()) return;

  const snapshot = readRawSnapshot();
  let changed = false;

  for (const [listingID, cartItem] of cartItems.entries()) {
    const previous = snapshot[listingID];
    const current = toEntry(cartItem);

    if (previous && cartItem.listing.price < previous.price) {
      useNotificationStore.getState().addNotification({
        type: "price_drop",
        title: "Price drop detected",
        message: `${cartItem.listing.title} dropped from $${previous.price} to $${cartItem.listing.price}.`,
      });
    }

    if (
      !previous ||
      previous.price !== current.price ||
      previous.quantity !== current.quantity ||
      previous.title !== current.title
    ) {
      snapshot[listingID] = current;
      changed = true;
    }
  }

  for (const listingID of Object.keys(snapshot)) {
    if (cartItems.has(listingID)) continue;

    const removed = snapshot[listingID];

    useNotificationStore.getState().addNotification({
      type: "cart_deleted",
      title: "Cart item removed",
      message: `${removed.title} was removed from your cart.`,
    });

    delete snapshot[listingID];
    changed = true;
  }

  if (changed) writeRawSnapshot(snapshot);
}

export function rememberCartItem(cartItem: CartItem) {
  if (!canUseStorage()) return;

  const snapshot = readRawSnapshot();
  snapshot[cartItem.listing.id] = toEntry(cartItem);
  writeRawSnapshot(snapshot);
}

export function forgetCartItem(listingID: string) {
  if (!canUseStorage()) return;

  const snapshot = readRawSnapshot();
  if (!(listingID in snapshot)) return;

  delete snapshot[listingID];
  writeRawSnapshot(snapshot);
}