import { AppHeader } from "@/components/header"
import { ListingCard } from "@/components/listing-card"
import { AppSidebar } from "@/components/sidebar"
import { SidebarInset } from "@/components/ui/sidebar"

export default function Main() {
    const listings = Array.from({length:10})

    return (
        <>
            <AppSidebar/>
            <SidebarInset>
                <AppHeader/>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
                    {listings.map((_, index) => 
                        (<ListingCard key={index} />)
                    )}
                </div>
            </SidebarInset>
        </>
    )
}