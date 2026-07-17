import type { Listing } from "@/types";
import { PersonalisedRecc } from "./personalisedRecc";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ListingGrid, ListingGridSkeleton } from "../listings/listingGrid";
import React from "react";
import { API_URL } from "@/lib/api";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "../ui/empty";
import { Button } from "../ui/button";

export function TestReccPage() {
  return (
    <div>
      <PersonalisedRecc />
      <CategoriesRecc />
    </div>
  );
}

export type CategoryListings = {
  category: string;
  listings: Listing[];
};

export function CategoriesRecc() {
  const [items, setItems] = React.useState<CategoryListings[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [refresh, setRefresh] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    setErr(null);
    async function getListings() {
      try {
        const res = await fetch(`${API_URL}/reccomendations/categories`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
        }
        setItems(json?.data?.categoryListings ?? []);
      } catch (error) {
        setErr(error instanceof Error ? error.message : "INTERNAL_ERROR");
      } finally {
        setLoading(false);
      }
    }
    getListings();
  }, [refresh]);

  return (
    <div className="p-2">
      <div className="pl-2">
        <p className="font-bold text-xl">Trending</p>
      </div>
      {loading && <CategoriesReccSkeleton />}
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
        <Tabs defaultValue={items?.[0]?.category ?? ""}>
          <TabsList variant="line">
            {items.map((item) => (
              <TabsTrigger value={item.category} key={item.category}>
                {item.category}
              </TabsTrigger>
            ))}
          </TabsList>
          {items.map((item) => (
            <TabsContent value={item.category} key={item.category}>
              <CategoriesReccComponenet item={item} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function CategoriesReccComponenet({ item }: { item: CategoryListings }) {
  const [l, setL] = React.useState<Listing[]>([]);

  React.useEffect(() => {
    setL(item.listings);
  }, [item]);

  return <ListingGrid listings={l} setListings={setL} isManaging={false} />;
}

function CategoriesReccSkeleton() {
  return (
    <Tabs defaultValue="0">
      <TabsList variant="line">
        {Array.from({ length: 3 }).map((_, index) => (
          <TabsTrigger value={`${index}`}>
            <Skeleton className="h-4 w-32" />
          </TabsTrigger>
        ))}
      </TabsList>
      {Array.from({ length: 3 }).map((_, index) => (
        <TabsContent value={`${index}`}>
          <ListingGridSkeleton isManaging={false} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
