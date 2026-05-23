import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton } from "./ui/sidebar";
import { CopyPlus, LogIn, LogOut, Package, Plus, ShoppingCart, SquareChartGantt, User } from "lucide-react";

export function AppSidebar() {
    const navigate = useNavigate()

    return(  
        <Sidebar collapsible="icon" typeof="floating">
            <SidebarContent>
                {true && 
                    <>
                    <SidebarGroup>
                        <SidebarGroupLabel>My listings</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuButton onClick={()=>navigate("")} tooltip="Manage listings">
                                <SquareChartGantt/>
                                Manage listings
                            </SidebarMenuButton>
                            <SidebarMenuButton onClick={()=>navigate("")} tooltip="Create listing">
                                <CopyPlus/>
                                Create listing
                            </SidebarMenuButton>
                        </SidebarMenu>
                    </SidebarGroup>
                    <SidebarGroup>
                        <SidebarGroupLabel>Cart</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuButton onClick={()=>navigate("")} tooltip="Cart">
                                <ShoppingCart/>
                                Cart
                            </SidebarMenuButton>
                        </SidebarMenu>
                    </SidebarGroup>
                    <SidebarGroup>
                        <SidebarGroupLabel>Orders</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuButton onClick={()=>navigate("")} tooltip="Orders">
                                <Package/>
                                Orders
                            </SidebarMenuButton>
                        </SidebarMenu>
                    </SidebarGroup>
                    </>
                }
            </SidebarContent>
            <SidebarFooter>
                <SidebarGroup>
                    <SidebarGroupLabel>Mange Account</SidebarGroupLabel>
                    {true &&
                        <SidebarMenu className="flex jusitfy-center items-center">
                            <SidebarMenuButton onClick={()=>navigate("/signup")} tooltip="Sign up">
                                <Plus/>
                                Sign up
                            </SidebarMenuButton>
                            <SidebarMenuButton onClick={()=>navigate("/login")} tooltip="Log in">
                                <LogIn/>
                                Log in
                            </SidebarMenuButton>
                        </SidebarMenu>
                    }
                    {true &&
                        <SidebarMenu className="flex jusitfy-center items-center">
                            <SidebarMenuButton onClick={()=>navigate("")} tooltip="Account">
                                <User/>
                                Account
                            </SidebarMenuButton>
                            <SidebarMenuButton onClick={()=>navigate("")} tooltip="Log out">
                                <LogOut/>
                                Log out
                            </SidebarMenuButton>
                        </SidebarMenu>
                    }
                </SidebarGroup>
            </SidebarFooter>
        </Sidebar>
    )
}