import { Outlet } from "react-router-dom";
import { AppSidebar } from "./sidebar";
import { SidebarInset } from "./ui/sidebar";
import { AppHeader } from "./header";

export function Layout() {
  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="flex min-h-0 flex-1">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  );
}
