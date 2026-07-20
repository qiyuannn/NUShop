import type { Listing } from "@/types";
import React from "react";
import { API_URL } from "@/lib/api";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { useNavigate } from "react-router-dom";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "../ui/empty";
import { Button } from "../ui/button";
import { ListingCarousel, ListingCarouselSkeleton } from "../listings/listingCarousel";

export function PersonalisedRecc() {
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [fetchReload, setFetchReload] = React.useState(false);

  const authApiFetch = useAuthApiFetch();
  const nav = useNavigate();

  React.useEffect(() => {
    setLoading(true);
    setErr(null);

    async function fetchListing() {
      try {
        const res = await authApiFetch(`${API_URL}/reccomendations/personalised`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
        }
        setListings(json?.data?.listings ?? []);
      } catch (error) {
        setErr(error instanceof Error ? error.message : "INTERNAL_ERROR");
      } finally {
        setLoading(false);
      }
    }
    fetchListing();
  }, [fetchReload]);

  return (
    <div className="p-2">
      <div className="pl-2">
        <p className="font-bold text-xl">Reccomended for you</p>
      </div>
      {loading && <ListingCarouselSkeleton isManaging={false} />}
      {!loading && !err && (
        <ListingCarousel listings={listings} setListings={setListings} isManaging={false} />
      )}
      {!loading && err == "UNAUTHORISED" && (
        <Empty className="bg-muted gap-1">
          <EmptyHeader>
            <EmptyTitle className="text-lg font-bold">No listings</EmptyTitle>
            <EmptyDescription>You are required to log in to view this section.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => nav("/login")}>Log in</Button>
          </EmptyContent>
        </Empty>
      )}
      {listings.length == 0 && err && err !== "UNAUTHORISED" && (
        <Empty className="bg-muted gap-1">
          <EmptyHeader>
            <EmptyTitle>Failed to fetch listings</EmptyTitle>
            <EmptyDescription>Refresh to try again</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => setFetchReload(!fetchReload)}>
              Refresh
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
