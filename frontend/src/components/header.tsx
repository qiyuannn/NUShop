import { SearchIcon, ShoppingBag, User2 } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { ButtonGroup } from "./ui/button-group";
import { Input } from "./ui/input";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
import { Separator } from "./ui/separator";
import { useAuth } from "@/context/auth";

export function AppHeader() {
    const { toggleSidebar } = useSidebar()
    const { user, token } = useAuth()

    return(
        <header className="sticky top-0 z-0 flex items-center h-12 p-2 pl-4 pr-4 gap-4 w-full bg-secondary">
            <SidebarTrigger onClick={()=>toggleSidebar}/>
            <Separator orientation="vertical"/>
            <div className="flex flex-none items-center gap-2">
                <ShoppingBag/>
                <h1 className="font-semibold">{token? `Welcome ${user?.lastName}!`: "Welcome!"}</h1>
            </div>
            <div className="flex-grow"/>
            <ButtonGroup>
                <Input id="search" placeholder="Search..."/>
                <Button variant="outline" aria-label="search">
                    <SearchIcon/>
                </Button>
            </ButtonGroup>
            {true && <div className="flex gap-2">    
                <Button variant="ghost"><Link to="/login">Log in</Link></Button>
                <Button><Link to="/signup">Sign up</Link></Button>
                </div>}
            {true && <div className="flex gap-3">
                <Link to="" className="hover:bg-sidebar-ring rounded-sm"><User2/></Link>
                </div>}
        </header>

    )
}