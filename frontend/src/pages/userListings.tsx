import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/header";
import { AppSidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from "@/components/ui/item";
import { SidebarInset } from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth";
import type { Listing } from "@/types";
import { Separator } from "@/components/ui/separator";
import { API_URL } from "@/lib/api";

function listingImageSrc(listing: Listing) {
  const image = listing.images?.[0];
  if (!image) return "https://via.placeholder.com/640";
  if (image.startsWith("http")) return image;
  if (image.startsWith("/")) return `${API_URL}${image}`;
  return `${API_URL}/${image}`;
}

export function UserListingsPage() {
  const {user, ready, token} = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (!ready) return;

  if (!user || !token) {
    setLoading(false);
    setListings([]);
    return;
  }

  async function fetchUserListings() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/listings/me`, {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.code ?? "FAILED_TO_FETCH_LISTINGS");
      }

      setListings(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAILED_TO_FETCH_LISTINGS");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }

  fetchUserListings();
}, [ready, user, token]);

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />

        <div className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">My listings</h1>
              <p className="text-sm text-muted-foreground">
                View and manage the items you have posted.
              </p>
            </div>

            <Button asChild>
              <Link to="/create">Create listing</Link>
            </Button>
          </div>

          {!ready ? (
            <p className="text-sm text-muted-foreground">Checking login status...</p>
          ) : !user ? (
            <div className="rounded-lg border p-6">
              <p className="mb-3 text-sm text-muted-foreground">
                Please log in to see your listings.
              </p>
              <Button asChild variant="outline">
                <Link to="/login">Log in</Link>
              </Button>
            </div>
          ) : loading ? (
            <p className="text-sm text-muted-foreground">Loading your listings...</p>
          ) : error ? (
            <p className="text-sm text-destructive">Failed to load listings.</p>
          ) : listings.length === 0 ? (
            <div className="rounded-lg border p-6">
              <p className="text-sm text-muted-foreground">You have no listings yet.</p>
              <div className="mt-4">
                <Button asChild>
                  <Link to="/create">Post your first listing</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {listings.map((listing) => (
                <Item asChild variant="outline" key={listing.uuid}>
                  <Link to={`/listing/${listing.uuid}`}>
                    <ItemHeader>
                      <img
                        src={listingImageSrc(listing)}
                        alt={listing.title}
                        className="aspect-square w-full rounded-lg bg-black object-contain outline"
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
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </>
  );
}