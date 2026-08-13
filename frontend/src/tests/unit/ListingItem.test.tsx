import {} from "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router-dom";
import type { Listing } from "@/types";
import type React from "react";
import type { SetStateAction } from "react";
import { timeAgo } from "@/lib/timeAgo";
import { ListingItemV3 } from "@/components/listings/listingItem";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";


vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );

  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

vi.mock("@/lib/timeAgo", () => ({
  timeAgo: vi.fn()
}))

vi.mock("@/hooks/use-authApiFetch", () => ({
  useAuthApiFetch: vi.fn()
}))

describe("Listing item", () => {
  const setListings = vi.fn() as React.Dispatch<SetStateAction<Listing[]>>
  const navigate = vi.fn()

  beforeEach(() => {
    ;(useNavigate as unknown as Mock).mockReturnValue(
      navigate
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it("renders all the listings fields", () => {
    const listing ={
      image: "bike.jpg",
      title: "bottle",
      price: 1,
      condition: "Brand New",
      createdOn: "1234",
      categoryName: "Sports",
      listingID: "123",
      isManaging: false,
      setListings: setListings
    }

    render(
      <MemoryRouter>
        <ListingItemV3 {...listing}/>
      </MemoryRouter>
    )
    expect(screen.getByText("$1")).toBeInTheDocument()
    expect(screen.getByText("Brand New")).toBeInTheDocument()
    expect(screen.getByText("Sports")).toBeInTheDocument()
    expect(timeAgo).toHaveBeenCalledOnce()
  })

  it("renders edit and delete button when is managing = True", () => {
    const listing ={
      image: "bike.jpg",
      title: "bottle",
      price: 1,
      condition: "Brand New",
      createdOn: "1234",
      categoryName: "Sports",
      listingID: "123",
      isManaging: true,
      setListings: setListings
    }

    render(
      <MemoryRouter>
        <ListingItemV3 {...listing}/>
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it("edit button navigates to edit listings page", async () => {
    const listing ={
      image: "bike.jpg",
      title: "bottle",
      price: 1,
      condition: "Brand New",
      createdOn: "1234",
      categoryName: "Sports",
      listingID: "123",
      isManaging: true,
      setListings: setListings
    }
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ListingItemV3 {...listing}/>
      </MemoryRouter>
    )
    await user.click(screen.getByRole('button', { name: /edit/i }))
    expect(navigate).toHaveBeenCalledWith("/listings/123/edit")
  })

  it("delete button calls handle delete function", async () => {
    const mockAuthApiFetch = vi.fn();
    ;(useAuthApiFetch as unknown as Mock).mockReturnValue(mockAuthApiFetch)

    mockAuthApiFetch.mockResolvedValue({
      ok: true
    } as Response)

    const listing ={
      image: "bike.jpg",
      title: "bottle",
      price: 1,
      condition: "Brand New",
      createdOn: "1234",
      categoryName: "Sports",
      listingID: "123",
      isManaging: true,
      setListings: setListings
    }
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ListingItemV3 {...listing}/>
      </MemoryRouter>
    )
    await user.click(screen.getByRole('button', { name: /delete/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(mockAuthApiFetch).toHaveBeenCalledOnce()
  })
})