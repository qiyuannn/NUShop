
import { NormalResults } from "@/components/search/normalResults";
import { SearchResults } from "@/components/search/searchResults";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemHeader } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Unauthorised } from "@/components/unauthorised";
import { useAuthStore } from "@/context/authStoreV2";
import { Pencil } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function ManageListing() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();  
  const [params] = useSearchParams()

  if (!token) {
    return <Unauthorised />;
  }

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
        { params.get("search") ? <SearchResults isManaging={true}/> : <NormalResults isManaging={true}/> }
      </div>
    </div>
  );
}
