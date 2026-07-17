import { useAuthStore } from "@/context/authStoreV2";
import { useFilterStore } from "@/context/filterStore";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { API_URL } from "@/lib/api";
import type { Listing } from "@/types";
import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ListingGrid, ListingGridSkeleton } from "../listings/listingGrid";
import { toast } from "sonner";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "../ui/empty";
import { Button } from "../ui/button";
import { FilterBar } from "../layout/filterBar";

export function SearchResultsV2({ isManaging }: { isManaging: boolean }) {
  const token = useAuthStore((s) => s.token);
  const authApiFetch = useAuthApiFetch();

  const [params] = useSearchParams();
  const category = params.get("category");
  const search = params.get("search");
  const userID = useParams().userID;
  const { minPrice, maxPrice, condition } = useFilterStore();

  const [cursor, setCursor] = React.useState<{
    hasMore: boolean;
    cursorID: string;
    cursorScore: number;
  } | null>(null);
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [refresh, setRefresh] = React.useState(false);

  const handleLoadMore = async () => {
    if (!cursor) {
      return;
    }
    const searchParams = new URLSearchParams();
    if (search != null) {
      searchParams.set("search", search);
    }
    if (minPrice != "") {
      searchParams.set("minPrice", minPrice);
    }
    if (maxPrice != "") {
      searchParams.set("maxPrice", maxPrice);
    }
    condition.forEach((condition) => searchParams.append("condition", condition));
    const category = params.get("category");
    if (category != null) {
      searchParams.set("category", category);
    }
    if (userID != null) {
      searchParams.set("sellerID", userID);
    }

    searchParams.set("cursorScore", cursor.cursorScore.toString());
    searchParams.set("cursorID", cursor.cursorID);

    const res = await (!isManaging
      ? fetch(
          `${API_URL}/listings${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )
      : authApiFetch(
          `${API_URL}/listings/manage${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
        ));

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
      const searchParams = new URLSearchParams();
      if (search != null) {
        searchParams.set("search", search);
      }
      if (minPrice != "") {
        searchParams.set("minPrice", minPrice);
      }
      if (maxPrice != "") {
        searchParams.set("maxPrice", maxPrice);
      }
      condition.forEach((condition) => searchParams.append("condition", condition));
      const category = params.get("category");
      if (category != null) {
        searchParams.set("category", category);
      }
      if (userID != null) {
        searchParams.set("sellerID", userID);
      }

      try {
        const res = await (!isManaging
          ? fetch(
              `${API_URL}/listings${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            )
          : authApiFetch(
              `${API_URL}/listings/manage${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
            ));
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
  }, [refresh, params, minPrice, maxPrice, condition]);

  return (
    <div className="p-2">
      <div className="pl-2">
        {(search || category) && <span className="text-xl">Showing results </span>}
        {search && (
          <>
            <span className="text-xl">for </span>
            <span className="text-xl font-bold">{search} </span>
          </>
        )}
        {category && (
          <>
            <span className="text-xl">in </span>
            <span className="text-xl font-bold">{category}</span>
          </>
        )}
      </div>
      <FilterBar />
      {loading && <ListingGridSkeleton isManaging={isManaging} />}
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
        <>
          <ListingGrid listings={listings} isManaging={isManaging} setListings={setListings} />
          {cursor?.hasMore && <Button onClick={handleLoadMore}>Load more</Button>}
        </>
      )}
    </div>
  );
}
