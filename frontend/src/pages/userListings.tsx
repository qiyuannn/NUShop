import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/header";
import { AppSidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from "@/components/ui/item";
import { SidebarInset } from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import type { Listing } from "@/types";
import { Separator } from "@/components/ui/separator";
import { API_URL } from "@/lib/api";
import { Pencil, Trash2 } from "lucide-react";

function listingImageSrc(listing: Listing) {
  const image = listing.images?.[0];
  if (!image) return "https://via.placeholder.com/640";
  if (image.startsWith("http")) return image;
  if (image.startsWith("/")) return `${API_URL}${image}`;
  return `${API_URL}/${image}`;
}

export function UserListingsPage() {
  const { user, ready } = useAuth();
  const apiFetch = useAuthApiFetch();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (listingID: string) => {
    if (!window.confirm("Delete this listing?")) return;

    try {
      const res = await apiFetch(`${API_URL}/listings/${listingID}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete listing");
      }

      setListings((prev) => prev.filter((listing) => listing.uuid !== listingID));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      setLoading(false);
      setListings([]);
      return;
    }

    async function fetchUserListings() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiFetch(`${API_URL}/listings/me`, {
          method: "GET",
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
  }, [ready, user]);

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />

        <div className="p-4">
          <div className="flex w-full items-center justify-between gap-3">
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {listings.map((listing) => (
                <Item
                  key={listing.uuid}
                  variant="outline"
                  className="relative flex h-full flex-col overflow-hidden"
                >
                  <div className="flex h-full flex-col p-0">
                    <Link to={`/listing/${listing.uuid}`} className="block">
                      <ItemHeader>
                        <img
                          src={listingImageSrc(listing)}
                          alt={listing.title}
                          className="h-56 w-full rounded-lg bg-black object-contain"
                        />
                      </ItemHeader>
                    </Link>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full shadow-md opacity-50 hover:opacity-100 transition-all duration-200"
                      onClick={() => handleDelete(listing.uuid)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ItemContent className="mt-4 flex flex-1 flex-col pb-2">
                      <div className="flex w-full items-center justify-between gap-3">
                        <Link
                          to={`/listing/${listing.uuid}`}
                          className="min-w-0 flex-1 overflow-hidden"
                        >
                          <ItemTitle className="truncate">
                            {listing.title}
                          </ItemTitle>
                        </Link>

                        <Button asChild size="sm" variant="outline" className="shrink-0">
                          <Link to={`/create/${listing.uuid}`}>
                            <Pencil className="mr-1 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                      </div>

                      <div className="mt-auto flex gap-2 pt-2">
                        <ItemDescription>${listing.price}</ItemDescription>
                        <Separator orientation="vertical" />
                        <ItemDescription>{listing.condition}</ItemDescription>
                      </div>
                    </ItemContent>
                  </div>
                </Item>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </>
  );
}