import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { API_URL } from "@/lib/api";
import React from "react";
import { Link, useParams } from "react-router-dom";

export function ChatHeader() {
  const authApiFetch = useAuthApiFetch();
  const param = useParams();
  const [chatInfo, setChatInfo] = React.useState({
    listingID: param.listingID!,
    title: "-",
    otherName: "-",
    image: "",
  });

  React.useEffect(() => {
    async function fetchChatInfo() {
      const res = await authApiFetch(`${API_URL}/chat/info/${param.listingID}/${param.otherID}`);
      const json = await res.json();

      if (res.ok) {
        setChatInfo((p) => ({
          ...p,
          title: json?.data?.title,
          otherName: json?.data?.otherName,
          image: json?.data?.image,
        }));
      }
    }
    fetchChatInfo();
  }, []);

  return (
    <Item>
      <Link to="/">
        <ItemMedia>
          <img
            src={`${API_URL}${chatInfo.image}`}
            className="aspect-square object-cover border rounded-sm w-12"
          />
        </ItemMedia>
        <ItemContent>
          <ItemDescription>{chatInfo.otherName}</ItemDescription>
          <ItemTitle className="font-bold text-xl">{chatInfo.title}</ItemTitle>
        </ItemContent>
      </Link>
    </Item>
  );
}
