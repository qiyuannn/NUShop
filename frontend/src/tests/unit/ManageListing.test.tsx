import {} from "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManageListing } from "@/pages/manageListing";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/components/search/searchResultsV2", () => ({
  SearchResultsV2: ({ isManaging }: { isManaging: boolean }) => (
    <div data-testid="mock-search-results">Managing: {String(isManaging)}</div>
  ),
}));

describe("ManageListing Page", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });
  it("renders page header and search results in manage mode", () => {
    render(
      <MemoryRouter>
        <ManageListing />
      </MemoryRouter>,
    );

    expect(screen.getByText("My Listings")).toBeInTheDocument();
    expect(screen.getByText("View and manage the items you have posted.")).toBeInTheDocument();
    expect(screen.getByTestId("mock-search-results")).toHaveTextContent("Managing: true");
  });

  it("navigates to create listing page when Create button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageListing />
      </MemoryRouter>,
    );

    const createBtn = screen.getByRole("button", { name: /create/i });
    await user.click(createBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/listings/create");
  });
});
