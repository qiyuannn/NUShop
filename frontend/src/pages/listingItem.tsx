import { API_URL } from "@/lib/api";
import { type Listing } from "@/types";
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/context/cartStore";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";

export function Listing() {
  const { listingID } = useParams();
  const addToCart = useCartStore((state) => state.addToCart);
  const authApiFetch = useAuthApiFetch();
  const nav = useNavigate();
  const { token } = useAuth();

  const [listing, setListing] = React.useState<Listing>({
    id: "",
    sellerID: "",
    title: "",
    description: "",
    price: 0,
    quantity: 0,
    condition: "",
    categoryName: "",
    createdOn: "",
    images: [],
  });
  const [err, setErr] = React.useState(false);
  const [seller, setSeller] = React.useState({
    firstName: "",
    lastName: "",
    createdOn: "",
  });

  const handleAddToCart = async () => {
    if (!token) {
      toast.message("Log in to add item to cart.");
      return;
    }

    try {
      await addToCart(authApiFetch, listing.id, 1, false);
      toast.success("Item added into cart");
    } catch (error) {
      toast.error("Failed to add item into cart, try again later.");
    }
  };

  React.useEffect(() => {
    setErr(false);
    async function fetchData() {
      try {
        const res1 = await fetch(`${API_URL}/listings/${listingID}`, {
          method: "GET",
        });
        const json1 = await res1.json();
        if (!res1.ok) {
          throw new Error(json1?.error?.code ?? "INTERNAL_ERROR");
        }
        setListing(json1.data.listing);

        const res2 = await fetch(`${API_URL}/user/${json1.data.listing.sellerID}`, {
          method: "GET",
        });
        const json2 = await res2.json();
        if (!res2.ok) {
          throw new Error(json2?.error?.code ?? "INTERNAL_ERROR");
        }
        setSeller(json2.data.user);
      } catch (error) {
        setErr(true);
      }
    }
    fetchData();
  }, []);

  if (!listingID || err) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p>Listing not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <Item className="pb-0">
          <ItemHeader className="sm:pl-16 sm:pr-16">
            <ItemCarousel files={listing.images} />
          </ItemHeader>
          <ItemContent className="sm:pl-16 sm:pr-16">
            <ItemTitle className="text-2xl font-bold">{listing.title}</ItemTitle>
            <ItemDescription className="text-lg">${listing.price}</ItemDescription>
            <Separator />
            <ItemTitle>Details</ItemTitle>
            <ItemDescription>Condition: {listing.condition}</ItemDescription>
            <ItemDescription>Category: {listing.categoryName}</ItemDescription>
            <div className="w-full min-w-0 text-muted-foreground">
              <p className="font-medium">Description:</p>
              <p className="text-wrap break-all">{listing.description}</p>
            </div>
            <Separator />
            <ItemTitle>Seller information</ItemTitle>
            <Item asChild>
              <Link to={`/user/${listing.sellerID}`}>
                <ItemMedia>
                  <Avatar size="lg">
                    <AvatarImage
                      src="https://github.com/shadcn.png"
                      alt="@shadcn"
                      className="grayscale"
                    />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent className="gap-0">
                  <ItemTitle>
                    {seller.firstName} {seller.lastName}
                  </ItemTitle>
                  <ItemDescription>
                    Joined since {new Date(seller.createdOn).getFullYear()}
                  </ItemDescription>
                </ItemContent>
              </Link>
            </Item>
          </ItemContent>
        </Item>
      </div>

      <div className="shrink-0 flex h-10 w-full gap-0 bg-secondary">
        <Button
          size="default"
          className="h-full flex-[1.6] rounded-none"
          onClick={() => nav(`/chat/${listing.sellerID}`)}
        >
          Chat with seller
        </Button>
        <Button size="default" className="h-full flex-[1.6] rounded-none" onClick={handleAddToCart}>
          Add to cart
        </Button>
        <Button size="default" className="h-full flex-[1.6] rounded-none" variant="destructive">
          Buy now
        </Button>
      </div>
    </div>
  );
}

export function ItemCarousel({ files }: { files: string[] }) {
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
    <div className="w-full">
      <Carousel setApi={setApi} opts={{ loop: false, containScroll: false }}>
        <CarouselContent>
          {files.length > 0 &&
            files.map((file) => (
              <CarouselItem className="basis-4/5 md:basis-1/2 lg:basis-2/7 pl-0" key={file}>
                <Item>
                  <ItemContent className="border rounded-sm">
                    <img
                      className="aspect-square object-cover"
                      src={file.startsWith("http") ? file : `${API_URL}${file}`}
                    />
                  </ItemContent>
                </Item>
              </CarouselItem>
            ))}
          {files.length === 0 && (
            <CarouselItem className="basis-4/5 md:basis-1/2 lg:basis-2/7 pl-0">
              <Item>
                <ItemContent className="flex h-56 items-center justify-center border rounded-sm">
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
