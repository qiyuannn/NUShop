import {} from "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { server } from "./server";
import { useAuthStore } from "@/context/authStoreV2";
import { Listing } from "@/pages/listingItem";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { API_URL } from "@/lib/api";
import { vi } from "vitest";

vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselPrevious: () => <button type="button">Previous</button>,
  CarouselNext: () => <button type="button">Next</button>,
}));

describe("listing", () => {
  beforeAll(() => {
    server.listen();
  });
  beforeEach(() => {
    useAuthStore.setState({ token: "token", userID: "user" });
  });
  afterAll(() => {
    server.close();
  });
  afterEach(() => {
    cleanup();
    server.resetHandlers();
  });

  it("Success - fetches and renders listing details and seller info correctly", async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () => {
        return HttpResponse.json(
          {
            data: {
              listing: {
                id: "listing-123",
                sellerID: "seller-456",
                title: "CS2103 Textbook 2nd Edition",
                description: "Very good condition, minimal notes inside.",
                price: 25,
                quantity: 1,
                condition: "Like new",
                categoryName: "Textbooks",
                createdOn: "2026-10-15T10:00:00Z",
                images: ["/uploads/book.png"],
                score: 10,
              },
            },
          },
          { status: 200 },
        );
      }),
      http.get(`${API_URL}/user/:id`, () => {
        return HttpResponse.json(
          {
            data: {
              user: {
                username: "nus_student",
                createdOn: "2026-01-01",
              },
            },
          },
          { status: 200 },
        );
      }),
    );

    render(
      <MemoryRouter initialEntries={["/listings/listing-123"]}>
        <Routes>
          <Route path="/listings/:listingID" element={<Listing />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("CS2103 Textbook 2nd Edition")).toBeInTheDocument();
      expect(screen.getByText("Very good condition, minimal notes inside.")).toBeInTheDocument();
      expect(screen.getByText("$25")).toBeInTheDocument();
      expect(screen.getByText("nus_student")).toBeInTheDocument();
      expect(screen.getByText(/Like new/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add to cart/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /buy now/i })).toBeInTheDocument();
    });
  });

  it("renders 'Listing not found' when API request fails", async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () => {
        return HttpResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
      }),
    );

    render(
      <MemoryRouter initialEntries={["/listings/unknown-id"]}>
        <Routes>
          <Route path="/listings/:listingID" element={<Listing />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Listing not found")).toBeInTheDocument();
    });
  });

  it("shows 'You are viewing your own listing' banner when sellerID matches current user", async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () => {
        return HttpResponse.json(
          {
            data: {
              listing: {
                id: "listing-own",
                sellerID: "user", // Matches authStore userID
                title: "My Own Item",
                description: "Test description",
                price: 10,
                quantity: 1,
                condition: "Brand new",
                categoryName: "Other",
                createdOn: "2026-10-15T10:00:00Z",
                images: [],
                score: 5,
              },
            },
          },
          { status: 200 },
        );
      }),
      http.get(`${API_URL}/user/:id`, () => {
        return HttpResponse.json(
          {
            data: {
              user: {
                username: "self_user",
                createdOn: "2026-01-01",
              },
            },
          },
          { status: 200 },
        );
      }),
    );

    render(
      <MemoryRouter initialEntries={["/listings/listing-own"]}>
        <Routes>
          <Route path="/listings/:listingID" element={<Listing />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("You are viewing your own listing")).toBeInTheDocument();
    });
  });
});