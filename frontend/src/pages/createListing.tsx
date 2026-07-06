import { ListingForm } from "@/components/listingForm";
import { Unauthorised } from "@/components/unauthorised";
import { useAuthStore } from "@/context/authStoreV2";

export function CreateListingPage() {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <Unauthorised />;
  }
  return <ListingForm typeCreate={true} />;
}
