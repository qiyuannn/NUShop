import { Link } from "react-router-dom";
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from "./ui/item";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Package } from "lucide-react";
import React from "react";
import { API_URL } from "@/lib/api";
import { timeAgo } from "@/lib/timeAgo";

export function HomePageItem({
  image,
  title,
  price,
  condition,
  createdOn,
  categoryName,
  listingID,
} : {
  image: string;
  title: string;
  price: number;
  condition: string;
  createdOn: string;
  categoryName: string;
  listingID: string;

}) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <Item asChild variant="outline">
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
  )
}