import {} from "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Results } from "@/pages/Results";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/search/searchResultsV2", () => ({
  SearchResultsV2: () => <div data-testid="mock-results">Results View</div>,
}));

describe("Results page", () => {
  it("renders SearchResultsV2 when query params exist", () => {
    render(
      <MemoryRouter initialEntries={["/results?q=laptop"]}>
        <Results />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("mock-results")).toBeInTheDocument();
  });
});
