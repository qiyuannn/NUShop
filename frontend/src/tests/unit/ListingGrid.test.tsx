import {} from "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import userEvent from "@testing-library/user-event";
import { ListingItemV3 } from "@/components/listings/listingItem";
import type { Listing } from "@/types";
import { ListingGrid } from "@/components/listings/listingGrid";
import React, { type SetStateAction } from "react";


vi.mock("@/components/listings/listingItem", () => ({
  ListingItemV3: vi.fn()
}))

describe("Listing grid", () => {
  const setListings = vi.fn() as React.Dispatch<SetStateAction<Listing[]>>

  afterEach(() => {
    cleanup()
  })

  it("renders 1 listing item per listing", () => {
    const listings: Listing[] = [
      {
        id: "1",
        title: "Bike",
        price: 100,
        condition: "Used",
        createdOn: "2026-07-24",
        categoryName: "Sports",
        images: ["bike.jpg"],
        sellerID: "123",
        description: "test",
        quantity: 1,
        score: 1
      },
      {
        id: "2",
        title: "Chair",
        price: 25,
        condition: "New",
        createdOn: "2026-07-24",
        categoryName: "Home",
        images: ["chair.jpg"],
        sellerID: "123",
        description: "test",
        quantity: 1,
        score: 1
      },
    ];

    render(<ListingGrid listings={listings} isManaging={false} setListings={setListings}/>)
    expect(ListingItemV3).toHaveBeenCalledTimes(2)
  })

  it("shows empty state when there are no listings", () => {
    render(<ListingGrid listings={[]} isManaging={false} setListings={setListings}/>)
    expect(screen.getByText(/no listings/i)).toBeInTheDocument()
  })

  it("Passes the first image when a listing has >1 images", () => {
    const listings: Listing[] = [
      {
        id: "1",
        title: "Bike",
        price: 100,
        condition: "Used",
        createdOn: "2026-07-24",
        categoryName: "Sports",
        images: ["bike.jpg", "bottle.hi"],
        sellerID: "123",
        description: "test",
        quantity: 1,
        score: 1
      },
    ];

    render(<ListingGrid listings={listings} isManaging={false} setListings={setListings}/>)
    expect(ListingItemV3).toHaveBeenCalledWith(
      expect.objectContaining({
      image: "bike.jpg",
      title: "Bike",
      price: 100,
      condition: "Used",
      createdOn: "2026-07-24",
      categoryName: "Sports",
      listingID: "1",
      isManaging: false,
      setListings: setListings
      }),
      undefined
    )
  })

  it("passes an empty image string when listing have no image", () => {
    const listings: Listing[] = [
      {
        id: "1",
        title: "Bike",
        price: 100,
        condition: "Used",
        createdOn: "2026-07-24",
        categoryName: "Sports",
        images: [],
        sellerID: "123",
        description: "test",
        quantity: 1,
        score: 1
      },
    ]

    render(<ListingGrid listings={listings} isManaging={false} setListings={setListings}/>)
    expect(ListingItemV3).toHaveBeenCalledWith(
      expect.objectContaining({
      image: "",
      title: "Bike",
      price: 100,
      condition: "Used",
      createdOn: "2026-07-24",
      categoryName: "Sports",
      listingID: "1",
      isManaging: false,
      setListings: setListings
      }),
      undefined
    )
  })
})