import type { Listing } from "@/types";
import React from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../ui/carousel";
import { API_URL } from "@/lib/api";
import { HomePageItem } from "../homePageItem";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { Link, useNavigate } from "react-router-dom";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "../ui/empty";
import { Button } from "../ui/button";
import { RefreshCcw } from "lucide-react";

export function PersonalisedRecc() {
  const [listings, setListings] = React.useState<Listing[]>([])
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string|null>(null)
  const [fetchReload, setFetchReload] = React.useState(false)
  
  const authApiFetch = useAuthApiFetch()
  const nav = useNavigate()

  React.useEffect(() => {
    setLoading(true)
    setErr(null)

    async function fetchListing() {      
      try {
        const res = await authApiFetch(`${API_URL}/reccomendations`)
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR")
        }
        console.log(json?.error?.code)
        setListings(json?.data?.listings ?? [])
      } catch (error) {
        setErr( error instanceof Error ? error.message : "INTERNAL_ERROR")
      } finally {
        setLoading(false)
      }
    }
    fetchListing()
  }, [fetchReload])

  return (
    <div className="p-2">
      <div className="pl-2">
        <p className="font-bold text-xl">Reccomended for you</p>
      </div>
      {listings.length > 0 && 
        <div className="sm:pl-16 sm:pr-16 border p-3 rounded-xl">
          <Carousel >
            <CarouselContent>
              {listings.map((listing) => (
                <CarouselItem className="basis-1/5">
                  <HomePageItem 
                    image={listing.images?.[0] ?? ""}
                    title={listing.title}
                    price={listing.price}
                    condition={listing.condition}
                    createdOn={listing.createdOn}
                    categoryName={listing.categoryName}
                    listingID={listing.id}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious/>
            <CarouselNext/>
          </Carousel>
        </div>
      }
      {listings.length == 0 && err == "UNAUTHORISED" &&
        <Empty className="bg-muted">
          <EmptyHeader>
            <EmptyTitle className="text-lg font-bold">No listings</EmptyTitle>
            <EmptyDescription>You are required to log in to view this section.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => nav("/login")}>Log in</Button>
          </EmptyContent>
        </Empty>
      }
      {listings.length == 0 && err != "UNAUTHORISED" &&
        <Empty className="bg-muted">
          <EmptyHeader>
            <EmptyTitle className="text-lg font-bold">Failed to load listings</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setFetchReload(!fetchReload)}>
              <RefreshCcw/> Reload
            </Button>
          </EmptyContent>
        </Empty>
      }
    </div>
  )
}
