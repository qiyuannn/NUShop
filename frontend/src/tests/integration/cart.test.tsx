import {} from "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    server.resetHandlers()
  })

  it("Add to cart button - POST fires witht the correct quantity and replace flag, UI updates")

  it("Remove from cart - item is removed from UI", async () => {
    server.use(
      http.delete(`${API_URL}/cart`, () => {
        return HttpResponse.json(null, { status: 200 })
      })
    )

    render(<CartPage/>, { wrapper: MemoryRouter })
    fireEvent.click(screen.getByRole("button", { name: /1 delete listing/i }))
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    await waitFor(() => {
      expect(screen.queryByText("listing 1")).not.toBeInTheDocument();
    });
  })
})