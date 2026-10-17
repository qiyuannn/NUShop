import { Outlet } from "react-router-dom";
import { SidebarInset } from "../ui/sidebar";
import { AppHeaderV2 } from "./headerV2";
import { AppSidebar } from "./sidebar";

export function LayoutV2() {
  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <AppHeaderV2 />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  );
}
