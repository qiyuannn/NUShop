import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
} from "./ui/sidebar";
import {
  CopyPlus,
  LogIn,
  LogOut,
  Package,
  Plus,
  ShoppingBag,
  ShoppingCart,
  SquareChartGantt,
  User,
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { useLogout } from "@/hooks/use-logout";
import { Badge } from "./ui/badge";
import { useCartStore } from "@/context/cartStore";

export function AppSidebar() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const logout = useLogout();
  const cartItems = useCartStore((state) => state.cartItems)

  return (
    <Sidebar collapsible="icon" typeof="floating">
      <SidebarHeader>
        <SidebarMenuButton
         onClick={() => navigate("/")} 
         tooltip="Home"
         >
          <ShoppingBag />
          <p className="font-bold text-xl">NUShop</p>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        {token && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>My listings</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuButton
                  onClick={() => navigate("/listings/manage")}
                  tooltip="Manage listings"
                >
                  <SquareChartGantt />
                  Manage listings
                </SidebarMenuButton>
                <SidebarMenuButton
                  onClick={() => navigate("/listings/create")}
                  tooltip="Create listing"
                >
                  <CopyPlus />
                  Create listing
                </SidebarMenuButton>
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Cart</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuButton onClick={() => navigate("/cart")} tooltip="Cart">
                  <ShoppingCart />
                  Cart
                  <Badge>{cartItems.size}</Badge>
                </SidebarMenuButton>
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Orders</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuButton onClick={() => navigate("")} tooltip="Orders" disabled>
                  <Package />
                  Orders
                </SidebarMenuButton>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupLabel>Manage Account</SidebarGroupLabel>
          {!token && (
            <SidebarMenu className="flex items-center justify-center">
              <SidebarMenuButton onClick={() => navigate("/signup")} tooltip="Sign up">
                <Plus />
                Sign up
              </SidebarMenuButton>
              <SidebarMenuButton onClick={() => navigate("/login")} tooltip="Log in">
                <LogIn />
                Log in
              </SidebarMenuButton>
            </SidebarMenu>
          )}
          {token && (
            <SidebarMenu className="flex items-center">
              <SidebarMenuButton onClick={() => navigate("")} tooltip="Account" disabled>
                <User />
                Account
              </SidebarMenuButton>
              <SidebarMenuButton
                onClick={() => {
                  logout();
                }}
                tooltip="Log out"
              >
                <LogOut />
                Log out
              </SidebarMenuButton>
            </SidebarMenu>
          )}
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
