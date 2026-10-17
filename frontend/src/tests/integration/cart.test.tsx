import {} from "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { server } from "./server";
import { useCartStore } from "@/context/cartStore";
import type { CartItem, Listing } from "@/types";
import { http, HttpResponse } from "msw";
import { API_URL } from "@/lib/api";
import { CartPage } from "@/pages/cart";
import { MemoryRouter } from "react-router-dom";

describe("cart", () => {
  beforeAll(() => {
    server.listen()
  })
  beforeEach(() => {
    const cartItems = new Map<string, CartItem>()
    const listing1: Listing = {
      id: '1',
      sellerID: '2',
      title: 'listing 1',
      description: 'test',
      price: 100,
      quantity: 1,
      condition: "Brand new",
      categoryName: "test",
      createdOn: "test",
      score: 1,
      images: []
    }
    const listing2: Listing = {
      id: '2',
      sellerID: '3',
      title: 'listing 2',
      description: 'test',
      price: 100,
      quantity: 1,
      condition: "Brand new",
      categoryName: "test",
      createdOn: "test",
      score: 1,
      images: []
    }
    cartItems.set('1', { listing: listing1, quantity: 1})
    cartItems.set('2', { listing: listing2, quantity: 1})

    useCartStore.setState({ cartItems })
  })
  afterAll(() => {
    server.close()
  })
  afterEach(() => {
    cleanup();
    server.resetHandlers();
  });

  it("Add to cart button - POST fires with the correct quantity and replace flag, UI updates", async () => {
    let capturedBody: any = null;
    server.use(
      http.post(`${API_URL}/cart`, async ({ request }) => {
        capturedBody = await request.json();
        const newListing: Listing = {
          id: '3',
          sellerID: '4',
          title: 'listing 3',
          description: 'test 3',
          price: 50,
          quantity: 2,
          condition: "Brand new",
          categoryName: "Books",
          createdOn: "2026-10-18",
          score: 1,
          images: [],
        };
        return HttpResponse.json(
          {
            data: {
              cartItem: {
                listing: newListing,
                quantity: 2,
              },
            },
          },
          { status: 200 },
        );
      }),
    );

    const mockAuthFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      return fetch(input, init);
    }) as any;

    await useCartStore.getState().addToCart(mockAuthFetch, '3', 2, false);

    expect(capturedBody).toEqual({ listingID: '3', quantity: 2, replace: false });
    expect(useCartStore.getState().cartItems.has('3')).toBe(true);
    expect(useCartStore.getState().cartItems.get('3')?.quantity).toBe(2);

    render(<CartPage />, { wrapper: MemoryRouter });
    expect(screen.getByText("listing 3")).toBeInTheDocument();
  });

  it("Remove from cart - item is removed from UI", async () => {
    server.use(
      http.delete(`${API_URL}/cart`, () => {
        return HttpResponse.json(null, { status: 200 })
      })
    )

    render(<CartPage/>, { wrapper: MemoryRouter })
    fireEvent.click(screen.getByRole("button", { name: /^1 delete listing$/i }))
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    await waitFor(() => {
      expect(screen.queryByText("listing 1")).not.toBeInTheDocument();
    });
  })
})