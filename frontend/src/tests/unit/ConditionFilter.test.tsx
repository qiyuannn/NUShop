import {} from "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { useFilterStore } from "@/context/filterStore";
import { ConditionFilter } from "@/components/layout/filterBar";

vi.mock("@/context/filterStore", () => ({
  useFilterStore: vi.fn(),
}));

describe("Condition Filter", () => {
  const setCondition = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders conditon buutton && all condition fields", () => {
    (useFilterStore as unknown as Mock).mockImplementation((selector) =>
      selector({
        condition: [],
        setCondition: setCondition,
      }),
    );
    render(<ConditionFilter />);
    expect(screen.getByRole("button", { name: /condition/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /condition/i }));
    expect(screen.getByRole("checkbox", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Brand new/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Like new/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /used/i })).toBeInTheDocument();
  });

  it("Select all removes all previously selected conditions", () => {
    (useFilterStore as unknown as Mock).mockImplementation((selector) =>
      selector({
        condition: ["Brand new"],
        setCondition: setCondition,
      }),
    );

    render(<ConditionFilter />);
    fireEvent.click(screen.getByRole("button", { name: /condition/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /all/i }));

    expect(setCondition).toHaveBeenCalledWith([]);
  });

  it("reset condtion filter when all conditions are selected", () => {
    (useFilterStore as unknown as Mock).mockImplementation((selector) =>
      selector({
        condition: ["Brand new", "Like new"],
        setCondition: setCondition,
      }),
    );

    render(<ConditionFilter />);
    fireEvent.click(screen.getByRole("button", { name: /condition/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /used/i }));

    expect(setCondition).toHaveBeenCalledWith([]);
  });

  it("Select works", () => {
    (useFilterStore as unknown as Mock).mockImplementation((selector) =>
      selector({
        condition: [],
        setCondition: setCondition,
      }),
    );

    render(<ConditionFilter />);
    fireEvent.click(screen.getByRole("button", { name: /condition/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /used/i }));

    const updater = setCondition.mock.calls[0][0];
    expect(updater([])).toEqual(["Well used"]);
  });

  it("Unselect works", () => {
    (useFilterStore as unknown as Mock).mockImplementation((selector) =>
      selector({
        condition: ["Well used"],
        setCondition: setCondition,
      }),
    );

    render(<ConditionFilter />);
    fireEvent.click(screen.getByRole("button", { name: /condition/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /used/i }));

    const updater = setCondition.mock.calls[0][0];
    expect(updater([])).toEqual([]);
  });
});
