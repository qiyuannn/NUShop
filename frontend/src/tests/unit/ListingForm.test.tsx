import {} from "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ListingForm } from "@/components/listings/listingForm";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/integration/server";
import { API_URL } from "@/lib/api";

const mockApiFetch = vi.fn();
vi.mock("@/hooks/use-authApiFetch", () => ({
  useAuthApiFetch: () => mockApiFetch,
}));

vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({ children }: any) => <div>{children}</div>,
  CarouselContent: ({ children }: any) => <div>{children}</div>,
  CarouselItem: ({ children }: any) => <div>{children}</div>,
  CarouselPrevious: () => <button type="button">Previous</button>,
  CarouselNext: () => <button type="button">Next</button>,
}));

describe("ListingForm", () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });
  beforeEach(() => {
    server.use(
      http.get(`${API_URL}/categories`, () => {
        return HttpResponse.json(
          {
            data: {
              categories: ["Electronics", "Books", "Furniture"],
            },
          },
          { status: 200 },
        );
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    server.resetHandlers();
  });

  it("renders form inputs for creating a new listing", async () => {
    render(
      <MemoryRouter>
        <ListingForm typeCreate={true} />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^post$/i })).toBeInTheDocument();
  });

  it("validates title input and updates title length indicator", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ListingForm typeCreate={true} />
      </MemoryRouter>,
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "MacBook Pro M3");

    expect(titleInput).toHaveValue("MacBook Pro M3");
    expect(screen.getByText("14/50")).toBeInTheDocument();
  });

  it("enforces numeric price input", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ListingForm typeCreate={true} />
      </MemoryRouter>,
    );

    const priceInput = screen.getByLabelText(/price/i);
    await user.type(priceInput, "abc");
    expect(priceInput).toHaveValue("");

    await user.type(priceInput, "1250");
    expect(priceInput).toHaveValue("1250");
  });
});
