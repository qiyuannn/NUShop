import type { Listing } from "@/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import { ListingItemSkeleton, ListingItemV3 } from "./listingItem";
import { Empty, EmptyTitle } from "../ui/empty";
import type { SetStateAction } from "react";

export function ListingCarousel({
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
    <div className="w-full min-w-0 sm:px-10">
      <Carousel className="w-full min-w-0" opts={{ align: "start", loop: true }}>
        <CarouselContent className="-ml-0.5">
          {listings.map((listing) => (
            <CarouselItem
              className="basis-1/2 sm:basis-48 lg:basis-56 pl-0.5"
              key={listing.id}
            >
              <ListingItemV3
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
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:inline-flex sm:-left-9" />
        <CarouselNext className="hidden sm:inline-flex sm:-right-9" />
      </Carousel>
    </div>
  );
}

export function ListingCarouselSkeleton({ isManaging }: { isManaging: boolean }) {
  return (
    <div className="w-full min-w-0 sm:px-10">
      <Carousel className="w-full min-w-0">
        <CarouselContent className="-ml-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem
              key={index}
              className="basis-1/2 sm:basis-48 lg:basis-56 pl-0.5"
            >
              <ListingItemSkeleton isManaging={isManaging} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:inline-flex sm:-left-9" />
        <CarouselNext className="hidden sm:inline-flex sm:-right-9" />
      </Carousel>
    </div>
  );
}
