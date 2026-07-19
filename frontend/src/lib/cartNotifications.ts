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

export function seedCartSnapshot(cartItems: Map<string, CartItem>) {
  if (!canUseStorage()) return;

  const snapshot = readRawSnapshot();
  let changed = false;

  for (const [listingID, cartItem] of cartItems.entries()) {
    if (!snapshot[listingID]) {
      snapshot[listingID] = toEntry(cartItem);
      changed = true;
    }
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