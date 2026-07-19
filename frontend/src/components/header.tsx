import { SearchIcon, Bell } from "lucide-react";
import { useNotificationStore } from "@/context/notificationStore";
import { Button } from "./ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ButtonGroup } from "./ui/button-group";
import { Input } from "./ui/input";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
import { Separator } from "./ui/separator";
import { useAuth } from "@/context/auth";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function AppHeader() {
  const { toggleSidebar } = useSidebar();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const location = useLocation();
  const {
    notifications,
    unreadCount,
    markAllRead,
  } = useNotificationStore();

  const q = new URLSearchParams(location.search);
  q.set("search", search);

  return (
    <header className="sticky top-0 z-50 flex items-center h-12 p-2 pl-4 pr-4 gap-4 w-full bg-secondary">
      <SidebarTrigger
        onClick={() => toggleSidebar}
        title="Expand Sidebar"
        className="rounded-md hover:bg-accent hover:ring-1 hover:ring-border"
      />
      <Separator orientation="vertical" />
      <div className="flex-grow" />
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
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full"
              onClick={markAllRead}
            >
              <Bell className="h-5 w-5" />

              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500" />
              )}
            </Button>

            <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-background shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="px-4 py-3 border-b font-semibold">
                Notifications
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="border-b last:border-0 px-4 py-3 hover:bg-accent"
                  >
                    <p className="text-sm font-medium">
                      {notification.title}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

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