import { SearchResultsV2 } from "@/components/search/searchResultsV2";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemHeader } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ManageListing() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full h-full">
      <Item>
        <ItemContent>
          <ItemHeader className="text-2xl font-bold">My Listings</ItemHeader>
          <ItemDescription>View and manage the items you have posted.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="lg" onClick={() => navigate("/listings/create")}>
            <Pencil />
            Create
          </Button>
        </ItemActions>
      </Item>
      <Separator />
      <div className="flex-1">
        <SearchResultsV2 isManaging={true} />
      </div>
    </div>
  );
}
