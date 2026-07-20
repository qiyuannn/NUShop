import { API_URL } from "@/lib/api";
import type { Listing } from "@/types";
import React from "react";
import { ListingGrid, ListingGridSkeleton } from "../listings/listingGrid";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "../ui/empty";
import { Button } from "../ui/button";

export function RecentListings() {
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [refresh, setRefresh] = React.useState(false);

  React.useEffect(() => {
    setErr(null);
    setLoading(true);
    async function fetchListings() {
      try {
        const res = await fetch(`${API_URL}/reccomendations/recents`);
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
    fetchListings();
  }, [refresh]);

  return (
    <div className="p-2">
      <div className="pl-2">
        <p className="font-bold text-xl">Recent Listings</p>
      </div>
      {loading && <ListingGridSkeleton isManaging={false} />}
      {!loading && err && (
        <Empty className="gap-1 bg-muted">
          <EmptyTitle>Failed to fetch listings</EmptyTitle>
          <EmptyDescription>Refresh to try again.</EmptyDescription>
          <EmptyContent>
            <Button variant={"outline"} onClick={() => setRefresh(!refresh)}>
              Refresh
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {!loading && !err && (
        <ListingGrid listings={listings} setListings={setListings} isManaging={false} />
      )}
    </div>
  );
}
