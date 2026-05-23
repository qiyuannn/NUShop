import { Link } from "react-router-dom";
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from "./ui/item";
import { Separator } from "./ui/separator";

export function ListingCard() {
    return(
        <Item asChild variant="outline">
            <Link to="">
                <ItemHeader>
                    <img
                        src="https://images.unsplash.com/photo-1610280777472-54133d004c8c?q=80&w=640&auto=format&fit=crop"
                        className="aspect-square rounded-lg outline"
                        />
                </ItemHeader>
                <ItemContent>
                    <ItemTitle>A very nice image</ItemTitle>
                    <div className="flex gap-2">
                        <ItemDescription>Price</ItemDescription>
                        <Separator orientation="vertical"/>
                        <ItemDescription>Condition</ItemDescription>    
                    </div> 
                </ItemContent>
            </Link>
        </Item>
    )
}