import { SearchResultsV2 } from "@/components/search/searchResultsV2";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { API_URL } from "@/lib/api";
import React from "react";
import { useParams } from "react-router-dom";

export function ProfilePage() {
  const { userID } = useParams();
  const [user, setUser] = React.useState({
    username: "",
    createdOn: "",
  });
  const [err, setErr] = React.useState(false);

  React.useEffect(() => {
    setErr(false);
    if (userID == "") {
      setErr(true);
      return;
    }
    async function fetchUser() {
      try {
        const res = await fetch(`${API_URL}/user/${userID}`, {
          method: "GET",
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
        }
        setUser(json.data.user);
      } catch {
        setErr(true);
      }
    }
    fetchUser();
  }, []);

  if (!user || err) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p>User not found</p>
      </div>
    );
  }

  return (
    <div>
      <Item className="p-10">
        <ItemMedia>
          <Avatar className="h-16 w-16">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" className="grayscale" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent className="gap-0">
          <ItemTitle className="font-bold text-xl">{user.username || "Unknown user"}</ItemTitle>
          <ItemDescription>Joined since {new Date(user.createdOn).getFullYear()}</ItemDescription>
        </ItemContent>
      </Item>
      <Separator />
      <div className="flex-1">
        <SearchResultsV2 isManaging={false} />
      </div>
    </div>
  );
}
