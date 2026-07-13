import React, { type SetStateAction, useState } from "react";
import { API_URL } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import type { Listing } from "@/types";
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from "./ui/item";
import { Separator } from "./ui/separator";
import { timeAgo } from "@/lib/timeAgo";
import { Badge } from "./ui/badge";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { Button } from "./ui/button";
import { Package, Pencil, Trash } from "lucide-react";
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

export function ListingsGalleryV2({
  listings,
  setListings,
  isManaging,
}: {
  listings: Listing[];
  setListings: React.Dispatch<SetStateAction<Listing[]>>;
  isManaging: boolean;
}) {
  if (listings.length == 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-center font-bold">No listings found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-3 lg:grid-cols-4">
      {listings.map((listing) => (
        <ListingItemV2
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
  );
}

export function ListingItemV2({
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
  const [imageError, setImageError] = useState(false);

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
          <ItemHeader className="aspect-square">
            {!image || imageError ? (
              <div className="aspect-square border rounded-lg w-full flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Package className="mx-auto h-10 w-10 opacity-50" />
                  <p className="text-sm text-muted-foreground mt-2">No image available</p>
                </div>
              </div>
            ) : (
              <img
                src={image.startsWith("http") ? image : `${API_URL}${image}`}
                className="aspect square border object-cover rounded-lg w-full h-full"
                onError={() => setImageError(true)}
              />
            )}
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
