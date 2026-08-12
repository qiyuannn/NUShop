import { useLocation, useNavigate } from "react-router-dom";
import { useFilterStore } from "@/context/filterStore";
import { ResetFilter } from "@/components/layout/filterBar";
import {} from "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/context/filterStore", () => ({
  useFilterStore: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useLocation: vi.fn(),
  useNavigate: vi.fn(),
}));

describe("Reset Filter", () => {
  const setMinPrice = vi.fn();
  const setMaxPrice = vi.fn();
  const setCondition = vi.fn();
  const navigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useNavigate as unknown as Mock).mockReturnValue(navigate);
    (useFilterStore as unknown as Mock).mockImplementation((selector: any) =>
      selector({
        setMinPrice,
        setMaxPrice,
        setCondition,
      }),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the reset button", () => {
    render(<ResetFilter />);
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });

  it("reset store values and removes cateogory from URL", () => {
    (useLocation as unknown as Mock).mockReturnValue({
      pathname: "/results",
      search: "?category=Electronics",
    });

    render(<ResetFilter />);
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    expect(setMinPrice).toHaveBeenCalledWith("");
    expect(setMaxPrice).toHaveBeenCalledWith("");
    expect(setCondition).toHaveBeenCalledWith([]);

    expect(navigate).toHaveBeenCalledWith("/results?");
  });

  it("preserves other query params", () => {
    (useLocation as unknown as Mock).mockReturnValue({
      pathname: "/results",
      search: "?search=test&category=Electronics",
    });

    render(<ResetFilter />);
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    expect(setMinPrice).toHaveBeenCalledWith("");
    expect(setMaxPrice).toHaveBeenCalledWith("");
    expect(setCondition).toHaveBeenCalledWith([]);

    expect(navigate).toHaveBeenCalledWith("/results?search=test");
  });

  it("works when category is not in query params", () => {
    (useLocation as unknown as Mock).mockReturnValue({
      pathname: "/results",
      search: "?search=test",
    });

    render(<ResetFilter />);
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    expect(setMinPrice).toHaveBeenCalledWith("");
    expect(setMaxPrice).toHaveBeenCalledWith("");
    expect(setCondition).toHaveBeenCalledWith([]);

    expect(navigate).toHaveBeenCalledWith("/results?search=test");
  });
});
