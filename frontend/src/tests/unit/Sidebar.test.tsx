import {} from "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/layout/sidebar";
import { useAuthStore } from "@/context/authStoreV2";
import { useCartStore } from "@/context/cartStore";
import { MemoryRouter } from "react-router-dom";
import type { CartItem } from "@/types";

const mockSetTheme = vi.fn();
vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

vi.mock("@/hooks/use-logout", () => ({
  useLogout: () => vi.fn(),
}));

vi.mock("@/hooks/use-authApiFetch", () => ({
  useAuthApiFetch: () => vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { chats: [] } }),
  }),
}));

vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: any) => <aside data-testid="app-sidebar">{children}</aside>,
  SidebarHeader: ({ children }: any) => <div>{children}</div>,
  SidebarContent: ({ children }: any) => <div>{children}</div>,
  SidebarFooter: ({ children }: any) => <div>{children}</div>,
  SidebarGroup: ({ children }: any) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: any) => <span>{children}</span>,
  SidebarMenu: ({ children }: any) => <div>{children}</div>,
  SidebarMenuButton: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

describe("AppSidebar", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, userID: null });
    useCartStore.setState({ cartItems: new Map() });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Guest menu options (Log in, Sign up) when unauthenticated", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /manage listings/i })).not.toBeInTheDocument();
  });

  it("renders Authenticated menu items (Manage listings, Create listing, Cart, Account, Log out)", () => {
    useAuthStore.setState({ token: "valid-token", userID: "user-123" });
    const cartItems = new Map<string, CartItem>();
    cartItems.set("1", {
      quantity: 1,
      listing: {
        id: "1",
        title: "Item 1",
        price: 10,
        quantity: 1,
        sellerID: "seller",
        description: "",
        condition: "New",
        categoryName: "Books",
        createdOn: "",
        score: 1,
        images: [],
      },
    });
    useCartStore.setState({ cartItems });

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /manage listings/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create listing/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // Cart badge
  });

  it("toggles theme when clicking Theme button", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );

    const themeButton = screen.getByRole("button", { name: /theme/i });
    await user.click(themeButton);
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });
});
