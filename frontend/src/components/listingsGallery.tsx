import { useFilterStore } from "@/context/filterStore";
import { FilterBar } from "./filterBar";
import React, { type SetStateAction } from "react";
import { API_URL } from "@/lib/api";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Listing } from "@/types";
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from "./ui/item";
import { Separator } from "./ui/separator";
import { timeAgo } from "@/lib/timeAgo";
import { Badge } from "./ui/badge";
import { Spinner } from "./ui/spinner";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { Button } from "./ui/button";
import { Pencil, Trash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

export function ListingGallery({ isManaging }: { isManaging: boolean }) {
  const [searchParams] = useSearchParams();
  const { userID } = useParams();
  const { minPrice, maxPrice, condition } = useFilterStore();
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [err, setErr] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const apiFetch = useAuthApiFetch();
  const [cursor, setCursor] = React.useState<{
    cursor_id: string;
    cursor_time: string;
    has_more: boolean;
  } | null>(null);

  const handleLoadMore = async () => {
    const params = new URLSearchParams();
    if (minPrice != "") {
      params.set("min_price", minPrice);
    }
    if (maxPrice != "") {
      params.set("max_price", maxPrice);
    }
    condition.forEach((condition) => params.append("condition", condition));
    const search = searchParams.get("search");
    if (search != null) {
      params.set("search", search);
    }
    const category = searchParams.get("category");
    if (category != null) {
      params.set("category", category);
    }
    if (userID) {
      params.set("seller_id", userID);
    }

    if (cursor != null && cursor?.has_more) {
      params.set("cursor_time", new Date(cursor.cursor_time).toISOString());
      params.set("cursor_id", cursor?.cursor_id ?? "");
    }

    params.set("limit", "10");

    try {
      const res = await (isManaging
        ? apiFetch(`${API_URL}/listings/me${params.toString() ? `?${params.toString()}` : ""}`, {
            method: "GET",
          })
        : fetch(`${API_URL}/listings${params.toString() ? `?${params.toString()}` : ""}`, {
            method: "GET",
          }));

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
      }
      setListings((p) => [...p, ...(json?.data?.listings ?? [])]);
      setCursor(json?.data?.cursor ?? null);

      console.log(json);
    } catch (error) {
      console.log(error);
      setErr(error instanceof Error ? error.message : "INTERNAL_ERR");
    }
  };

  React.useEffect(() => {
    setErr("");
    setLoading(true);
    setCursor(null);

    async function fetchListings() {
      const params = new URLSearchParams();
      if (minPrice != "") {
        params.set("min_price", minPrice);
      }
      if (maxPrice != "") {
        params.set("max_price", maxPrice);
      }
      condition.forEach((condition) => params.append("condition", condition));
      const search = searchParams.get("search");
      if (search != null) {
        params.set("search", search);
      }
      const category = searchParams.get("category");
      if (category != null) {
        params.set("category", category);
      }
      if (userID) {
        params.set("seller_id", userID);
      }

      params.set("limit", "10");

      try {
        const res = await (isManaging
          ? apiFetch(`${API_URL}/listings/me${params.toString() ? `?${params.toString()}` : ""}`, {
              method: "GET",
            })
          : fetch(`${API_URL}/listings${params.toString() ? `?${params.toString()}` : ""}`, {
              method: "GET",
            }));

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
        }
        setListings(json?.data?.listings ?? []);
        setCursor(json?.data?.cursor ?? null);
        console.log(json);
      } catch (error) {
        console.log(error);
        setErr(error instanceof Error ? error.message : "INTERNAL_ERR");
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, [minPrice, maxPrice, condition, searchParams]);

  if (listings.length == 0) {
    return (
      <div className="flex flex-col h-full">
        <FilterBar />
        <div className="flex-1 flex items-center justify-center">
          {!loading && !err && <p className="font-bold">No listings found</p>}
          {loading && (
            <div className="flex flex-col items-center justify-center">
              <Spinner />
              <p className="font-bold"> Loading</p>
            </div>
          )}
          {!loading && err && <p className="font-bold">Network error</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <FilterBar />
      <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-3 lg:grid-cols-4">
        {listings.map((listing) => (
          <ListingItem
            image={listing.images?.[0] ?? ""}
            title={listing.title}
            price={listing.price}
            condition={listing.condition}
            createdOn={listing.createdOn}
            categoryName={listing.categoryName}
            listingID={listing.id}
            setListings={setListings}
            isManaging={isManaging}
            key={listing.id}
          />
        ))}
      </div>
      {cursor?.has_more && (
        <div className="flex items-center justify-center mb-5">
          <Button size="lg" onClick={handleLoadMore}>
            Load more
          </Button>
        </div>
      )}
      {!cursor?.has_more && (
        <div className="flex items-center justify-center mb-5">
          <p className="text-muted-foreground">No more listings</p>
        </div>
      )}
    </div>
  );
}

export function ListingItem({
  image,
  title,
  price,
  condition,
  createdOn,
  categoryName,
  listingID,
  setListings,
  isManaging,
}: {
  image: string;
  title: string;
  price: number;
  condition: string;
  createdOn: string;
  categoryName: string;
  listingID: string;
  setListings: React.Dispatch<SetStateAction<Listing[]>>;
  isManaging: boolean;
}) {
  const navigate = useNavigate();
  const authApiFetch = useAuthApiFetch();

  const handleDelete = async () => {
    const res = await authApiFetch(`${API_URL}/listings/${listingID}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setListings((p) => p.filter((listing) => listing.id != listingID));
    }
  };

  return (
    <div>
      <Item
        asChild
        variant="outline"
        className={isManaging ? "rounded-b-none p-0 pb-4 border-0" : "p-0 border-0 pb-3"}
      >
        <Link to={`/listing/${listingID}`}>
          <ItemHeader>
            <img
              src={image.startsWith("http") ? image : `${API_URL}${image}`}
              className="aspect-square border object-cover rounded-lg w-full"
            />
          </ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="w-full">{title}</ItemTitle>
            <div className="flex flex-row gap-2">
              <ItemDescription>${price}</ItemDescription>
              <Separator orientation="vertical" />
              <ItemDescription>{condition}</ItemDescription>
            </div>
            <div className="flex justify-between">
              <ItemDescription>{timeAgo(createdOn)}</ItemDescription>
              <Badge variant="secondary">{categoryName}</Badge>
            </div>
          </ItemContent>
        </Link>
      </Item>
      {isManaging && (
        <div className="flex flex-row rounded-lg object-cover rounded-t-none">
          <Button
            className="flex-3 rounded-none rounded-bl-md"
            variant="secondary"
            onClick={() => navigate(`/listings/${listingID}/edit`)}
          >
            <Pencil />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="flex-1 rounded-none rounded-br-md" variant="destructive">
                <Trash />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is irreversible. This will permenantly delete this listing form out
                  database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
