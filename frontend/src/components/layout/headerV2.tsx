import { ShoppingBasket, UserRound } from "lucide-react";
import { Button } from "../ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";
import { Separator } from "../ui/separator";
import React from "react";
import { useAuthStore } from "@/context/authStoreV2";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group";

export function AppHeaderV2() {
  const { toggleSidebar } = useSidebar();
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const location = useLocation();

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
      <div className="flex flex-row">
        {token && (
          <>
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
