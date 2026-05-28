import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { Listing } from "@/types";
import React from "react";
import { useParams } from "react-router-dom";

export function ListingPage() {
  const param = useParams();
  const [err, setErr] = React.useState<string | null>(null);
  const [listingData, setListingData] = React.useState<Listing | null>(null);

  React.useEffect(() => {
    setErr(null);
    setListingData(null);
    async function getListing() {
      const id = param.listingID;
      if (!id) {
        setErr("INVALID_ID");
        return;
      }
      const res = await fetch(`http://localhost:8080/listing/${encodeURIComponent(id)}`, {
        method: "GET",
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error?.code ?? "INTERNAL_ERROR");
      } else {
        setListingData(json?.data?.listing);
      }
    }
    getListing();
  }, [param.listingID]);


  return (
    <Carousel>
      <CarouselContent>
        {listingData?.images?.map((image) => (
          <Card key={image}>
            <img src={image} alt="" />
          </Card>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
