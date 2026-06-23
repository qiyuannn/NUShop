import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Link } from "react-router-dom";

export function Test() {
  return (
    <ItemGroup>
      <Item asChild className="items-center">
        <Link to="/">
          <ItemMedia>
            <img
              src="https://github.com/evilrabbit.png"
              className="aspect-square object-cover border rounded-sm w-12"
            />
          </ItemMedia>
          <ItemContent className="gap-0">
            <ItemDescription>Seller username</ItemDescription>
            <ItemTitle className="font-bold text-xl">Title</ItemTitle>
            <ItemDescription>Content</ItemDescription>
          </ItemContent>
          <ItemActions className="self-start">
            <ItemDescription>Time</ItemDescription>
          </ItemActions>
        </Link>
      </Item>
    </ItemGroup>
  );
}
