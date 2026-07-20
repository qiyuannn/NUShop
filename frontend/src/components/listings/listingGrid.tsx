import type { Listing } from "@/types";
import { ListingItemSkeleton, ListingItemV3 } from "./listingItem";
import { Empty, EmptyTitle } from "../ui/empty";
import type React from "react";
import type { SetStateAction } from "react";

export function ListingGrid({
  listings,
  isManaging,
  setListings,
}: {
  listings: Listing[];
  isManaging: boolean;
  setListings: React.Dispatch<SetStateAction<Listing[]>>;
}) {
  if (listings.length == 0) {
    return (
      <Empty className="bg-muted">
        <EmptyTitle>There are no listings at the moment. Please check back later.</EmptyTitle>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {listings.map((listing) => (
        <ListingItemV3
          key={listing.id}
          image={listing.images?.[0] ?? ""}
          title={listing.title}
          price={listing.price}
          condition={listing.condition}
          createdOn={listing.createdOn}
          categoryName={listing.categoryName}
          listingID={listing.id}
          isManaging={isManaging}
          setListings={setListings}
        />
      ))}
    </div>
  );
}

export function ListingGridSkeleton({ isManaging }: { isManaging: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 8 }).map((_, idx) => (
        <ListingItemSkeleton key={idx} isManaging={isManaging} />
      ))}
    </div>
  );
}
