import { ListingGallery } from "@/components/listingsGallery";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemHeader } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Unauthorised } from "@/components/unauthorised";
import { useAuth } from "@/context/auth";
import { Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ManageListing() {
  const { token } = useAuth();
  const navigate = useNavigate();

  if (!token) {
    return <Unauthorised />;
  }

  return (
    <div className="w-full h-full">
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
      <ListingGallery isManaging={true} />
    </div>
  );
}
