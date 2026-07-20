import { API_URL } from "@/lib/api";
import type { Listing } from "@/types";
import React from "react";
import { ListingGrid, ListingGridSkeleton } from "../listings/listingGrid";
import { Button } from "../ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "../ui/empty";
import { toast } from "sonner";

export function Explore() {
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [cursor, setCursor] = React.useState<{
    hasMore: boolean;
    cursorID: string;
    cursorScore: number;
    cursorSeed: string;
  } | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [refresh, setRefresh] = React.useState(false);

  const handleLoadMore = async () => {
    if (!cursor) {
      return;
    }

    const q = new URLSearchParams();
    q.set("cursorSeed", cursor.cursorSeed);
    q.set("cursorScore", cursor.cursorScore.toString());
    q.set("cursorID", cursor.cursorID);

    const res = await fetch(`${API_URL}/listings?${q}`);
    const json = await res.json();

    if (!res.ok) {
      toast.error("failed to fetch listings. Please try again.");
      return;
    }

    setListings([...listings, ...(json?.data?.listings ?? [])]);
    setCursor(json?.data?.cursor ?? null);
  };

  React.useEffect(() => {
    setLoading(true);
    setErr(null);
    async function fetchListings() {
      try {
        const res = await fetch(`${API_URL}/listings`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
        }
        setListings(json?.data?.listings ?? []);
        setCursor(json?.data?.cursor ?? null);
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
        <p className="font-bold text-xl">Explore</p>
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
        <div>
          <ListingGrid listings={listings} setListings={setListings} isManaging={false} />
          {cursor?.hasMore && <Button onClick={handleLoadMore}>Load more</Button>}
        </div>
      )}
    </div>
  );
}
