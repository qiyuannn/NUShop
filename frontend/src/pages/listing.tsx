import { AppHeader } from "@/components/header";
import { AppSidebar } from "@/components/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { SidebarInset } from "@/components/ui/sidebar";
import { MessageSquare, ShoppingCart, User } from "lucide-react";
import React from "react";
import { useParams } from "react-router-dom";

export function ListingPage() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <ListingMain />
      </SidebarInset>
    </>
  );
}

export function ListingMain() {
  const param = useParams();
  const [listingData, setListingData] = React.useState({
    uuid: "",
    sellerUUID: "",
    title: "",
    description: "",
    price: "",
    quantitiy: "",
    condition: "",
    category: "",
    images: [],
  });
  const [sellerData, setSellerData] = React.useState({
    firstName: "",
    lastName: "",
    createdOn: "",
  });
  const [err, setErr] = React.useState(false);

  React.useEffect(() => {
    async function fetchListing() {
      const listingID = param.listingID;
      if (!listingID) {
        return;
      }
      try {
        const res = await fetch(`http://localhost:8080/listings/${encodeURIComponent(listingID)}`, {
          method: "GET",
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
        }
        setListingData({
          ...json.data.listing,
          price: String(json.data.listing.price),
          quantitiy: String(json.data.listing.quantitiy),
        });

        const res1 = await fetch(
          `http://localhost:8080/user/${encodeURIComponent(json.data.listing.sellerUUID)}`,
          {
            method: "GET",
          },
        );
        const json1 = await res1.json();
        if (!res1.ok) {
          throw new Error(json1?.error?.code ?? "INTERNAL_ERROR");
        }
        setSellerData(json1.data.user);

        const res2 = await fetch(
          `http://localhost:8080/categories/${encodeURIComponent(json.data.listing.categoryUUID)}`,
        );
        const json2 = await res2.json();
        if (!res2.ok) {
          throw new Error(json2?.error?.code ?? "INTERNAL_ERROR");
        }
        console.log(json2.data.category.name)
        setListingData((p) => ({ ...p, category: json2.data.category.name }));

      } catch (error) {
        console.log(error instanceof Error ? error.message : "idk");
        setErr(true);
      } finally {
        console.log(listingData);
      }
    }
    fetchListing();
  }, [param.listingID]);

  return (
    <div>
      <div className="pl-16 pr-16">
        <ListingCarousel files={listingData.images} />
      </div>
      <Card className="ring-0">
        <CardHeader>
          <CardAction>
            <Badge variant="outline">{listingData.category}</Badge>
          </CardAction>
          <CardTitle>{listingData.title}</CardTitle>
          <CardDescription className="flex gap-2">
            <p>${listingData.price}</p>
            <Separator orientation="vertical" />
            <p>{listingData.condition}</p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Description:</p>
          <p>{listingData.description}</p>
        </CardContent>
        <CardContent>
          <p>Seller information:</p>
          <Item variant="outline">
            <ItemMedia>
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>
                  <User />
                </AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent className="gap-0">
              <ItemTitle>{sellerData.firstName + "" + sellerData.lastName}</ItemTitle>
              <ItemDescription>
                Joined since {new Date(sellerData.createdOn).getFullYear()}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button variant="secondary">View Profile</Button>
            </ItemActions>
          </Item>
        </CardContent>
        <CardFooter className="flex flex-cols bg-0 border-0 gap-2">
          <Button variant="secondary" className="flex flex-1">
            <MessageSquare />
            Chat with Seller
          </Button>
          <Button variant="secondary" className="flex-1">
            <ShoppingCart />
            Add to Cart
          </Button>
          <Button variant="destructive" className="flex-2 text-black">
            Buy
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export function ListingCarousel({ files }: { files: string[] }) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [count, setCount] = React.useState(0);
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }
    api.reInit();

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api, files]);

  return (
    <div>
      <Carousel setApi={setApi} opts={{ loop: true, containScroll: false }}>
        <CarouselContent>
          {files.length > 0 && files.map((file) => (
            <CarouselItem className="basis-1/2">
              <Item>
                <ItemContent className="border rounded-sm">
                  <img
                    className="aspect-square object-cover"
                    key={file}
                    src={`http://localhost:8080${file}`}
                  />
                </ItemContent>
              </Item>
            </CarouselItem>
          ))}
          {files.length === 0 && (
            <CarouselItem className="basis-1/2">
              <Item>
                <ItemContent className="flex items-center justify-center border rounded-sm aspect-square">
                  <ItemDescription>Listing have no images</ItemDescription>
                </ItemContent>
              </Item>
            </CarouselItem>
          )}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      {files.length > 0 && (
        <div className="py-2 text-center text-sm text-muted-foreground">
          Photo {current} of {count}
        </div>
      )}
    </div>
  );
}
