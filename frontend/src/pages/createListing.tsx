import { ListingForm } from "@/components/listingForm";
import { Unauthorised } from "@/components/unauthorised";
import { useAuth } from "@/context/auth";

export function CreateListingPage() {
  const { token } = useAuth();
  if (!token) {
    return <Unauthorised />;
  }
  return <ListingForm typeCreate={true} />;
}
