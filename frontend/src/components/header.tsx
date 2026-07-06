import { SearchIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ButtonGroup } from "./ui/button-group";
import { Input } from "./ui/input";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
import { Separator } from "./ui/separator";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuthStore } from "@/context/authStoreV2";

export function AppHeader() {
  const { toggleSidebar } = useSidebar();
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const location = useLocation();

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
