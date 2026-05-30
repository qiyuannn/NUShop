import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/header";
import { AppSidebar } from "@/components/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import type { Listing } from "@/types";
import { API_URL } from "@/lib/api";

type ListingWithDetails = Listing;

export default function Main() {
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParam] = useSearchParams();
  const search = searchParam.get("s") ?? "";

  useEffect(() => {
    async function fetchListings() {
      try {
        setLoading(true);

        const url = search.trim()
          ? `${API_URL}/listings?search=${encodeURIComponent(search.trim())}`
          : `${API_URL}/listings`;

        const res = await fetch(url, {
          method: "GET",
        });

        const json = await res.json();

        setListings(json.data ?? []);
      } catch (err) {
        console.error("Failed to fetch listings:", err);
        setListings([]);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, [search]);

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />

        <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3 lg:grid-cols-4">
          {loading ? (
            <p className="col-span-full p-4 text-sm text-muted-foreground">Loading listings...</p>
          ) : listings.length === 0 ? (
            <p className="col-span-full p-4 text-sm text-muted-foreground">No listings found.</p>
          ) : (
            listings.map((listing) => (
              <Item asChild variant="outline" key={listing.uuid}>
                <Link to={`/listing/${listing.uuid}`}>
                  <ItemHeader>
                    <img
                      src={
                        !listing.images?.[0]
                          ? "https://via.placeholder.com/640"
                          : listing.images[0].startsWith("http")
                            ? listing.images[0]
                            : listing.images[0].startsWith("/")
                              ? `${API_URL}${listing.images[0]}`
                              : `${API_URL}/${listing.images[0]}`
                      }
                      alt={listing.title}
                      className="w-full aspect-square object-contain rounded-lg outline bg-black"
                    />
                  </ItemHeader>

                  <ItemContent>
                    <ItemTitle>{listing.title}</ItemTitle>
                    <div className="flex gap-2">
                      <ItemDescription>${listing.price}</ItemDescription>
                      <Separator orientation="vertical" />
                      <ItemDescription>{listing.condition || "Unknown"}</ItemDescription>
                    </div>
                  </ItemContent>
                </Link>
              </Item>
            ))
          )}
        </div>
      </SidebarInset>
    </>
  );
}
