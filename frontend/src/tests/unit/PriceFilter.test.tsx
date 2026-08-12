import { PriceFilter } from "@/components/layout/filterBar";
import { useFilterStore } from "@/context/filterStore";
import {} from "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import userEvent from "@testing-library/user-event";

vi.mock("@/context/filterStore", () => ({
  useFilterStore: vi.fn(),
}));

describe("Price Filter", () => {
  const setMinPrice = vi.fn();
  const setMaxPrice = vi.fn();

  beforeEach(() => {
    (useFilterStore as unknown as Mock).mockImplementation((selector: any) =>
      selector({
        setMinPrice,
        minPrice: "",
        setMaxPrice,
        maxPrice: "",
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks()
  });

  it("renders the price button & min and max price input field", () => {
    render(<PriceFilter />);
    expect(screen.getByRole("button", { name: /price/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /price/i }));

    expect(screen.getByLabelText("Min")).toBeInTheDocument();
    expect(screen.getByLabelText("Max")).toBeInTheDocument();
  });

  it("typing digits into Min calls setMinPrice", async () => {
    const user = userEvent.setup();
    render(<PriceFilter />);

    await user.click(screen.getByRole("button", { name: /Price/i }));
    const minInput = screen.getAllByRole("textbox")[0];
    await user.type(minInput, "1");

    expect(setMinPrice).toHaveBeenCalledOnce();
    expect(setMinPrice).toHaveBeenCalledWith("1");
    expect(setMaxPrice).toHaveBeenCalledWith("1");
  });

  it("typing digits into Max calls setMax price", async () => {
    const user = userEvent.setup();
    render(<PriceFilter />);

    await user.click(screen.getByRole("button", { name: /Price/i }));
    const maxInput = screen.getAllByRole("textbox")[1];
    await user.type(maxInput, "1");

    expect(setMaxPrice).toHaveBeenCalled();
    expect(setMaxPrice).toHaveBeenCalledWith("1");
    expect(setMinPrice).toHaveBeenCalledWith("0");
  });

  it("Non-numeric input are ignored", async () => {
    const user = userEvent.setup();
    render(<PriceFilter />);

    await user.click(screen.getByRole("button", { name: /Price/i }));
    const maxInput = screen.getAllByRole("textbox")[0];
    await user.type(maxInput, "a.'");

    expect(setMinPrice).not.toHaveBeenCalled();
    expect(setMaxPrice).not.toHaveBeenCalled();

    const minInput = screen.getAllByRole("textbox")[0];
    await user.type(minInput, "a.'");

    expect(setMinPrice).not.toHaveBeenCalled();
    expect(setMaxPrice).not.toHaveBeenCalled();
  });

  it("lowers min to match max if max < min", async () => {
    (useFilterStore as unknown as Mock).mockImplementation((selector: any) =>
      selector({
        setMinPrice,
        setMaxPrice,
        minPrice: "9",
        maxPrice: "",
      }),
    );
    const user = userEvent.setup();

    render(<PriceFilter />);
    await user.click(screen.getByRole("button", { name: /price/i }));
    const maxInput = screen.getAllByRole("textbox")[1];
    await user.type(maxInput, "7");

    expect(setMaxPrice).toHaveBeenCalledWith("7");
    expect(setMinPrice).toHaveBeenCalledWith("7");
  });

  it("increases max to min if min > max", async () => {
    (useFilterStore as unknown as Mock).mockImplementation((selector: any) =>
      selector({
        setMinPrice,
        setMaxPrice,
        minPrice: "",
        maxPrice: "3",
      }),
    );
    const user = userEvent.setup();

    render(<PriceFilter />);
    await user.click(screen.getByRole("button", { name: /price/i }));
    const minInput = screen.getAllByRole("textbox")[0];
    await user.type(minInput, "7");

    expect(setMaxPrice).toHaveBeenCalledWith("7");
    expect(setMinPrice).toHaveBeenCalledWith("7");
  });
});
