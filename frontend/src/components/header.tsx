import { Bell, SearchIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ButtonGroup } from "./ui/button-group";
import { Input } from "./ui/input";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
import { Separator } from "./ui/separator";
import { useAuth } from "@/context/auth";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { API_URL } from "@/lib/api";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import type { chat } from "@/types";
import { useCartStore } from "@/context/cartStore";
import { readCartSnapshot } from "@/lib/cartNotifications";

export function AppHeader() {
  const authApiFetch = useAuthApiFetch();
  const cartItems = useCartStore((state) => state.cartItems);
  const [unreadChats, setUnreadChats] = React.useState<chat[]>([]);
  const { toggleSidebar } = useSidebar();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const location = useLocation();

  React.useEffect(() => {
    if (!token) {
      setUnreadChats([]);
      return;
    }

    let alive = true;

    async function loadUnreadChats() {
      const res = await authApiFetch(`${API_URL}/chat`);
      if (!alive || !res.ok) return;

      const json = await res.json();
      const chats: chat[] = json?.data?.chats ?? [];
      setUnreadChats(chats.filter((c) => (c.unreadCount ?? 0) > 0));
    }

    void loadUnreadChats();

    const refreshChats = () => {
      void loadUnreadChats();
    };

    window.addEventListener("chat-message-received", refreshChats);

    return () => {
      alive = false;
      window.removeEventListener("chat-message-received", refreshChats);
    };
  }, [token, authApiFetch]);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const cartSnapshot = readCartSnapshot();

  const priceCutAlerts = Array.from(cartItems.values()).flatMap((cartItem) => {
    const previous = cartSnapshot[cartItem.listing.id];
    if (!previous || previous.price <= cartItem.listing.price) return [];

    return [
      {
        id: `price-cut-${cartItem.listing.id}`,
        title: cartItem.listing.title,
        description: `${formatMoney(previous.price)} → ${formatMoney(cartItem.listing.price)}`,
        href: "/cart",
      },
    ];
  });

  const deletedCartAlerts = Object.values(cartSnapshot)
    .filter((entry) => !cartItems.has(entry.listingID))
    .map((entry) => ({
      id: `deleted-${entry.listingID}`,
      title: entry.title,
      description: "That listing was deleted, so it no longer appears in your cart.",
      href: "/cart",
    }));

  const unreadMessageAlerts = unreadChats.map((chat) => ({
    id: `chat-${chat.listingID}-${chat.otherID}`,
    title: `${chat.otherName} sent ${chat.unreadCount} unread message${(chat.unreadCount ?? 0) > 1 ? "s" : ""}`,
    description: chat.title,
    href: `/chat/${chat.listingID}/${chat.otherID}`,
  }));

  const notificationCount =
    priceCutAlerts.length + deletedCartAlerts.length + unreadMessageAlerts.length;

  const q = new URLSearchParams(location.search);
  q.set("search", search);

  return (
    <header className="sticky top-0 z-50 flex items-center h-12 p-2 pl-4 pr-4 gap-4 w-full bg-secondary">
      <SidebarTrigger
        onClick={toggleSidebar}
        title="Expand Sidebar"
        className="rounded-md hover:bg-accent hover:ring-1 hover:ring-border"
      />
      <Separator orientation="vertical" />
      <div className="flex-grow" />

      {token && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell />
              {notificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none">
                  {notificationCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-96 p-0">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">Cart alerts and unread chats</p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notificationCount === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  No new notifications.
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-2">
                  {priceCutAlerts.length > 0 && (
                    <section className="space-y-1">
                      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Price cuts
                      </p>
                      {priceCutAlerts.map((item) => (
                        <Link
                          key={item.id}
                          to={item.href}
                          className="block rounded-md px-3 py-2 hover:bg-muted/60"
                        >
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </Link>
                      ))}
                    </section>
                  )}

                  {unreadMessageAlerts.length > 0 && (
                    <section className="space-y-1">
                      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Unread messages
                      </p>
                      {unreadMessageAlerts.map((item) => (
                        <Link
                          key={item.id}
                          to={item.href}
                          className="block rounded-md px-3 py-2 hover:bg-muted/60"
                        >
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </Link>
                      ))}
                    </section>
                  )}

                  {deletedCartAlerts.length > 0 && (
                    <section className="space-y-1">
                      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Deleted items
                      </p>
                      {deletedCartAlerts.map((item) => (
                        <Link
                          key={item.id}
                          to={item.href}
                          className="block rounded-md px-3 py-2 hover:bg-muted/60"
                        >
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </Link>
                      ))}
                    </section>
                  )}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <ButtonGroup>
        <Input
          id="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              navigate(`${location.pathname}?${q}`);
            }
          }}
        />
        <Button
          variant="outline"
          aria-label="search"
          onClick={() => navigate(`${location.pathname}?${q}`)}
          className="hidden sm:flex"
        >
          <SearchIcon />
        </Button>
      </ButtonGroup>
      {!token && (
        <div className="flex gap-2">
          <Button variant="ghost">
            <Link to="/login">Log in</Link>
          </Button>
          <Button>
            <Link to="/signup">Sign up</Link>
          </Button>
        </div>
      )}
      {token && (
        <div className="flex gap-3">
          <Link to="" className="hover:bg-sidebar-ring rounded-sm">
            <Avatar>
              <AvatarImage src="https://github.com/evilrabbit.png" />
              <AvatarFallback>HI</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      )}
    </header>
  );
}
