import { API_URL } from "@/lib/api";
import type { AuthApiFetch, CartItem } from "@/types";
import { create } from "zustand";

type CartStore = {
  cartItems: Map<string, CartItem>;
  initCart: (authApiFetch: AuthApiFetch) => Promise<void>;
  addToCart: (
    authApiFetch: AuthApiFetch,
    listingID: string,
    quantity: number,
    replace: boolean,
  ) => Promise<void>;
  deleteFromCart: (authApiFetch: AuthApiFetch, listingID: string) => Promise<void>;
};

export const useCartStore = create<CartStore>((set) => ({
  cartItems: new Map<string, CartItem>(),

  initCart: async (authApiFetch) => {
    const res = await authApiFetch(`${API_URL}/cart`, {
      method: "GET",
    });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(
        json?.error?.message ??
        json?.error?.code ??
        json?.message ??
        "INTERNAL_ERROR",
      );
    }

    const cartItems = new Map<string, CartItem>();

    (json?.data?.cartItems ?? []).forEach((cartItem: CartItem) => {
      cartItems.set(cartItem.listing.id, cartItem);
    });

    set({ cartItems: cartItems });
  },

  addToCart: async (authApiFetch, listingID, quantity, replace) => {
    const res = await authApiFetch(`${API_URL}/cart`, {
      method: "POST",
      body: JSON.stringify({ listingID: listingID, quantity: quantity, replace: replace }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(
        json?.error?.code ??
        json?.error?.message ??
        "INTERNAL_ERROR",
      );
    }

    set((state) => {
      const cartItems = new Map(state.cartItems);
      cartItems.set(listingID, json.data.cartItem);

      return {
        cartItems: cartItems,
      };
    });
  },

  deleteFromCart: async (authApiFetch, listingID) => {
    const res = await authApiFetch(`${API_URL}/cart`, {
      method: "DELETE",
      body: JSON.stringify({ listingID: listingID }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(
        json?.error?.code ??
        json?.error?.message ??
        "INTERNAL_ERROR",
      );
    }

    set((state) => {
      const cartItems = new Map(state.cartItems);
      cartItems.delete(listingID);

      return {
        cartItems: cartItems,
      };
    });
  },
}));
