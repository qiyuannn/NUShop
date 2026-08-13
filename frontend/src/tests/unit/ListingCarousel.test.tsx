import {} from "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListingItemV3 } from "@/components/listings/listingItem";
import { ListingCarousel } from "@/components/listings/listingCarousel";
import type React from "react";
import type { Listing } from "@/types";
import type { SetStateAction } from "react";


vi.mock("@/components/listings/ListingItem", () => ({
  ListingItemV3: vi.fn(() => null),
}));



vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselPrevious: () => <button type="button">Previous</button>,
  CarouselNext: () => <button type="button">Next</button>,
}));

describe("Listing Carousel", () => {
  const setListings = vi.fn() as React.Dispatch<SetStateAction<Listing[]>>

  afterEach(() => {
    cleanup()
  })

  it("shows empty state when there are no listings", () => {
    render(<ListingCarousel listings={[]} isManaging={false} setListings={setListings}/>)
    expect(screen.getByText(/no listings/i)).toBeInTheDocument()
  });

  it("renders one listing item per listing", () => {
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

    render(<ListingCarousel listings={listings} isManaging={false} setListings={setListings}/>)
    expect(ListingItemV3).toHaveBeenCalledTimes(2)
  })

  it("passes the first image when listing have >1 image", () => {
    const listings: Listing[] = [
      {
        id: "1",
        title: "Bike",
        price: 100,
        condition: "Used",
        createdOn: "2026-07-24",
        categoryName: "Sports",
        images: ["bike.jpg", "lorry.jpg"],
        sellerID: "123",
        description: "test",
        quantity: 1,
        score: 1
      },
    ]

    render(<ListingCarousel listings={listings} isManaging={false} setListings={setListings}/>)
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

    render(<ListingCarousel listings={listings} isManaging={false} setListings={setListings}/>)
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