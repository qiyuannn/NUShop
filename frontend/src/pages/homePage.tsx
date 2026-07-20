import { CategoriesRecc } from "@/components/reccomendation/categoriesRecc";
import { Explore } from "@/components/reccomendation/explore";
import { PersonalisedRecc } from "@/components/reccomendation/personalisedRecc";
import { RecentListings } from "@/components/reccomendation/recents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function HomePageV2() {
  return (
    <Tabs defaultValue="featured">
      <TabsList variant="line" className="w-full sticky top-12 z-50 bg-background">
        <TabsTrigger value="featured">Featured</TabsTrigger>
        <TabsTrigger value="explore">Explore</TabsTrigger>
      </TabsList>
      <TabsContent value="featured">
        <PersonalisedRecc />
        <CategoriesRecc />
        <RecentListings />
      </TabsContent>
      <TabsContent value="explore" className="flex-1">
        <Explore />
      </TabsContent>
    </Tabs>
  );
}
