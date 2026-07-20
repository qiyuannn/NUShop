import { Link, useNavigate } from "react-router-dom";
import { Item, ItemContent, ItemDescription, ItemFooter, ItemHeader, ItemTitle } from "../ui/item";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import React, { type SetStateAction } from "react";
import { API_URL } from "@/lib/api";
import { Package } from "lucide-react";
import { timeAgo } from "@/lib/timeAgo";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import type { Listing } from "@/types";
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
} from "../ui/alert-dialog";

export function ListingItemV3({
  image,
  title,
  price,
  condition,
  createdOn,
  categoryName,
  listingID,
  isManaging,
  setListings,
}: {
  image: string;
  title: string;
  price: number;
  condition: string;
  createdOn: string;
  categoryName: string;
  listingID: string;
  isManaging: boolean;
  setListings: React.Dispatch<SetStateAction<Listing[]>>;
}) {
  const [imageError, setImageError] = React.useState(false);
  const authApiFetch = useAuthApiFetch();
  const navigate = useNavigate();

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
      <Item asChild className="rounded-none p-1">
        <Link to={`/listing/${listingID}`}>
          <ItemHeader className="aspect-square">
            {!image || imageError ? (
              <div className="aspect-square border w-full flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Package className="mx-auto h-10 w-10 opacity-50" />
                  <p className="text-sm text-muted-foreground mt-2">No image available</p>
                </div>
              </div>
            ) : (
              <img
                src={image.startsWith("http") ? image : `${API_URL}${image}`}
                className="aspect-square border object-cover w-full h-full"
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
        <ItemFooter className="flex flex-row">
          <Button
            className="flex-3"
            variant="secondary"
            onClick={() => navigate(`/listings/${listingID}/edit`)}
          >
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="flex-1" variant="destructive">
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
        </ItemFooter>
      )}
    </div>
  );
}

export function ListingItemSkeleton({ isManaging }: { isManaging: boolean }) {
  return (
    <Item className="rounded-none p-1">
      <ItemHeader className="border">
        <Skeleton className="aspect-square w-full rounded-none" />
      </ItemHeader>
      <ItemContent className="gap-2">
        <Skeleton className="h-4.5 w-full" />
        <Skeleton className="h-4.5 w-1/2" />
        <Skeleton className="h-4.5 w-1/4" />
      </ItemContent>
      {isManaging && (
        <ItemFooter>
          <Skeleton className="w-3/5 h-8" />
          <Skeleton className="w-2/5 h-8" />
        </ItemFooter>
      )}
    </Item>
  );
}
