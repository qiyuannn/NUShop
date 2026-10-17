import {} from "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { server } from "./server";
import { ProfilePage } from "@/pages/profile";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { API_URL } from "@/lib/api";

// Mock search results subcomponent
vi.mock("@/components/search/searchResultsV2", () => ({
  SearchResultsV2: () => <div data-testid="mock-search-results">SearchResults Mock</div>,
}));

describe("ProfilePage", () => {
  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });
  afterEach(() => {
    cleanup();
    server.resetHandlers();
  });

  it("fetches and displays user profile and joined year", async () => {
    server.use(
      http.get(`${API_URL}/user/:id`, () => {
        return HttpResponse.json(
          {
            data: {
              user: {
                username: "johndoe",
                createdOn: "2024-05-10T08:00:00Z",
              },
            },
          },
          { status: 200 },
        );
      }),
    );

    render(
      <MemoryRouter initialEntries={["/profile/user-999"]}>
        <Routes>
          <Route path="/profile/:userID" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("johndoe")).toBeInTheDocument();
      expect(screen.getByText("Joined since 2024")).toBeInTheDocument();
      expect(screen.getByTestId("mock-search-results")).toBeInTheDocument();
    });
  });

  it("displays 'User not found' when API request fails", async () => {
    server.use(
      http.get(`${API_URL}/user/:id`, () => {
        return HttpResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
      }),
    );

    render(
      <MemoryRouter initialEntries={["/profile/unknown-user"]}>
        <Routes>
          <Route path="/profile/:userID" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("User not found")).toBeInTheDocument();
    });
  });
});
