import { ListingGallery } from "@/components/listingsGallery";
import { Separator } from "@/components/ui/separator";
import { useSearchParams } from "react-router-dom";


// To be revamped
export function HomePage() {
  const [params] = useSearchParams();

  const category = params.get("category");
  const search = params.get("search");

  return (
    <div className="w-full h-full">
      {search && category && (
        <div>
          <div className="p-8">
            <span className="text-3xl">Search results for </span>
            <span className="text-3xl font-bold">{search} </span>
            <span>in </span>
            <span className="font-bold">{category}</span>
          </div>
          <Separator />
        </div>
      )}
      {search && !category && (
        <div>
          <div className="p-8">
            <span className="text-3xl">Search results for </span>
            <span className="text-3xl font-bold">{search} </span>
          </div>
          <Separator />
        </div>
      )}
      {!search && category && (
        <div>
          <div className="p-8">
            <span className="text-3xl">Showing items from </span>
            <span className="text-3xl font-bold">{category} </span>
          </div>
          <Separator />
        </div>
      )}
      <ListingGallery isManaging={false} />
    </div>
  );
}
