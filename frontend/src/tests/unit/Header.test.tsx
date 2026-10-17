import {} from "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppHeaderV2 } from "@/components/layout/headerV2";
import { useAuthStore } from "@/context/authStoreV2";
import { useNotificationStore } from "@/context/notificationStore";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: () => <button aria-label="Toggle Sidebar">Sidebar</button>,
  useSidebar: () => ({ toggleSidebar: vi.fn() }),
}));

describe("AppHeaderV2", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, userID: null });
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Login and Sign up buttons when user is not authenticated", () => {
    render(
      <MemoryRouter>
        <AppHeaderV2 />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
  });

  it("renders cart, notification bell, and profile buttons when logged in", () => {
    useAuthStore.setState({ token: "valid-token", userID: "user-123" });
    useNotificationStore.setState({
      notifications: [
        {
          id: "1",
          type: "message",
          title: "New message",
          message: "Hi there",
          read: false,
          createdAt: Date.now(),
        },
      ],
      unreadCount: 1,
    });

    render(
      <MemoryRouter>
        <AppHeaderV2 />
      </MemoryRouter>,
    );

    // Shows unread badge count
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /log in/i })).not.toBeInTheDocument();
  });

  it("allows searching via input and clicking search button", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AppHeaderV2 />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/type to search/i);
    await user.type(input, "calculus");
    expect(input).toHaveValue("calculus");

    const searchBtn = screen.getByRole("button", { name: /search/i });
    expect(searchBtn).toBeInTheDocument();
  });
});
