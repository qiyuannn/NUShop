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
    <div className="sm:pl-16 sm:pr-16">
      <Carousel>
        <CarouselContent className="-ml-0.5">
          {listings.map((listing) => (
            <CarouselItem
              className="basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 pl-0.5"
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
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

export function ListingCarouselSkeleton({ isManaging }: { isManaging: boolean }) {
  return (
    <div className="sm:pl-16 sm:pr-16">
      <Carousel>
        <CarouselContent className="-ml-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem
              key={index}
              className="basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 pl-0.5"
            >
              <ListingItemSkeleton isManaging={isManaging} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
