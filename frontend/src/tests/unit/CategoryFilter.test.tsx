import {} from "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { useLocation, useNavigate } from "react-router-dom";
import { CategoryFilter } from "@/components/layout/filterBar";

vi.mock("react-router-dom", () => ({
  useLocation: vi.fn(),
  useNavigate: vi.fn(),
}));

describe("Category Filter", () => {
  const navigate = vi.fn();

  beforeEach(() => {
    (useNavigate as unknown as Mock).mockReturnValue(navigate);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue({
        ok: true,
        json: async () => ({
          data: {
            categories: ["Books", "Electronics"],
          },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("correctly displays all categories", async () => {
    render(<CategoryFilter />);
    fireEvent.click(screen.getByRole("button", { name: /categories/i }));

    expect(await screen.findByText("Books")).toBeInTheDocument();
    expect(await screen.findByText("Electronics")).toBeInTheDocument();
  });

  it("adds a new category query param (no category in query param intitially)", async () => {
    (useLocation as unknown as Mock).mockReturnValue({
      pathname: "/results",
      search: "",
    });

    render(<CategoryFilter />);
    fireEvent.click(screen.getByRole("button", { name: /categories/i }));
    const electronicsButton = await screen.findByRole("button", { name: /electronics/i });
    fireEvent.click(electronicsButton);
    expect(navigate).toHaveBeenCalledWith("/results?category=Electronics");
  });

  it("replaces the old query param (category in query param initially)", async () => {
    (useLocation as unknown as Mock).mockReturnValue({
      pathname: "/results",
      search: "?category=Books",
    });

    render(<CategoryFilter />);
    fireEvent.click(screen.getByRole("button", { name: /categories/i }));
    const electronicsButton = await screen.findByRole("button", { name: /electronics/i });
    fireEvent.click(electronicsButton);
    expect(navigate).toHaveBeenCalledWith("/results?category=Electronics");
  });

  it("removes category from query param, when selection is 'All'", () => {
    (useLocation as unknown as Mock).mockReturnValue({
      pathname: "/results",
      search: "?category=Books",
    });

    render(<CategoryFilter />);
    fireEvent.click(screen.getByRole("button", { name: /categories/i }));
    fireEvent.click(screen.getByRole("button", { name: /all/i }));
    expect(navigate).toHaveBeenCalledWith("/results?");
  });

  it("preserves other query params when category param is added", async () => {
    (useLocation as unknown as Mock).mockReturnValue({
      pathname: "/results",
      search: "?search=test",
    });

    render(<CategoryFilter />);
    fireEvent.click(screen.getByRole("button", { name: /categories/i }));
    const electronicsButton = await screen.findByRole("button", { name: /electronics/i });
    fireEvent.click(electronicsButton);
    expect(navigate).toHaveBeenCalledWith("/results?search=test&category=Electronics");
  });

  it("preserves other query params when category param is removed", () => {
    (useLocation as unknown as Mock).mockReturnValue({
      pathname: "/results",
      search: "?category=Books&search=test",
    });

    render(<CategoryFilter />);
    fireEvent.click(screen.getByRole("button", { name: /categories/i }));
    fireEvent.click(screen.getByRole("button", { name: /all/i }));
    expect(navigate).toHaveBeenCalledWith("/results?search=test");
  });
});
