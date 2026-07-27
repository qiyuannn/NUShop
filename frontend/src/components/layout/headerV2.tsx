import { Bell, ShoppingBasket, UserRound } from "lucide-react";
import { Button } from "../ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";
import { Separator } from "../ui/separator";
import React from "react";
import { useAuthStore } from "@/context/authStoreV2";
import { useNotificationStore } from "@/context/notificationStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group";

export function AppHeaderV2() {
  const { toggleSidebar } = useSidebar();
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const location = useLocation();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const notifications = useNotificationStore((state) => state.notifications);
  const markAllRead = useNotificationStore((state) => state.markAllRead);

  const q = new URLSearchParams(location.search);
  if (search.trim()) {
    q.set("search", search.trim());
  } else {
    q.delete("search");
  }

  const handleNav = () => {
    if (location.pathname.includes("manage") || location.pathname.includes("user")) {
      navigate(`${location.pathname}?${q}`);
    } else {
      navigate(`/results?${q}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center h-16 p-2 pl-4 pr-4 gap-4 w-full justify-between bg-background">
      <SidebarTrigger
        onClick={() => toggleSidebar}
        className="rounded-md hover:bg-accent hover:ring-1 hover:ring-border"
      />
      <InputGroup className="max-w-md">
        <InputGroupInput
          placeholder="Type to search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleNav();
            }
          }}
        />
        <InputGroupAddon align={"inline-end"}>
          <InputGroupButton variant={"secondary"} aria-label="search" onClick={handleNav}>
            Search
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <div className="flex flex-row items-center gap-1">
        {token && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-lg" variant="ghost" className="relative">
                  <Bell />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-2 py-1.5 text-sm font-semibold">Notifications</div>
                <DropdownMenuSeparator />

                {notifications.length === 0 ? (
                  <DropdownMenuItem disabled>No notifications yet</DropdownMenuItem>
                ) : (
                  notifications.slice(0, 6).map((n) => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1">
                      <span className="font-medium">{n.title}</span>
                      <span className="text-xs text-muted-foreground">{n.message}</span>
                    </DropdownMenuItem>
                  ))
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    markAllRead();
                    navigate("/chat");
                  }}
                >
                  Mark all as read
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="icon-lg" variant="ghost" onClick={() => navigate("/cart")}>
              <ShoppingBasket />
            </Button>
            <Button size="icon-lg" variant="ghost" disabled>
              <UserRound />
            </Button>
          </>
        )}

        {!token && (
          <>
            <Button variant="link" onClick={() => navigate("/login")}>
              Log in
            </Button>
            <Separator orientation="vertical" />
            <Button variant="link" onClick={() => navigate("/signup")}>
              Sign up
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
