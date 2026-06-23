import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { useAuth } from "@/context/auth";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { API_URL, WS_URL } from "@/lib/api";
import type { chat, WSMessage } from "@/types";
import React from "react";
import { Link } from "react-router-dom";
import useWebSocket from "react-use-websocket";

export function ChatDirectory() {
  const { token } = useAuth();
  const authApiFetch = useAuthApiFetch();
  const [chats, setChats] = React.useState<chat[]>([]);
  const [err, setErr] = React.useState(false);

  useWebSocket(token ? `${WS_URL}/ws` : null, {
    queryParams: { token: token! },
    share: true,
    shouldReconnect: () => true,
    onOpen: () => {
      console.log("conn open");
    },
    onClose: () => {
      console.log("conn closed");
    },
    onMessage: async (event: MessageEvent) => {
      const msg = JSON.parse(event.data) as WSMessage;

      if (msg.type !== "message") {
        return;
      }

      if (msg.message == undefined) {
        return;
      }

      const message = msg.message;

      var updated = false;
      setChats((p) => {
        const existing = p.find((chat) => chat.listingID == message.listingID);
        if (existing) {
          updated = true;
          const newChat: chat = {
            ...existing,
            content: msg?.message?.content ?? "",
            createdOn: msg?.message?.createdOn ?? "",
          };
          return [newChat, ...p.filter((chat) => chat.listingID !== message.listingID)];
        }
        return p;
      });

      if (!updated) {
        const res = await fetch(`${API_URL}/chat/info/${msg.message.listingID}/${msg.message.senderID}/${msg.message.receiverID}`);
        const json = await res.json();

        const newChat: chat = {
          listingID: message.listingID,
          title: json?.data?.title ?? "Failed to load title",
          content: message.content,
          createdOn: message.createdOn,
          otherName: json?.data?.username ?? "Failed to load username",
          image: json?.data?.image ?? "",
        };

        setChats((p) => [newChat, ...p]);
      }
    },
  });

  React.useEffect(() => {
    setErr(false);
    async function getChats() {
      try {
        const res = await authApiFetch(`${API_URL}/chat`, {
          method: "GET",
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
        }
        setChats(json?.data?.chats ?? []);
      } catch (error) {
        setErr(true);
      }
    }
    getChats();
  }, []);

  return (
    <div>
      <ItemGroup>
        {chats.map((chat) => (
          <Item key={chat.listingID}>
            <Link to="/">
              <ItemMedia>
                <img
                  src={`${API_URL}${chat.image}`}
                  className="aspect-square object-cover border rounded-sm w-12"
                />
              </ItemMedia>
              <ItemContent>
                <ItemDescription>{chat.otherName}</ItemDescription>
                <ItemTitle className="text-bold font-xl">{chat.title}</ItemTitle>
                <ItemDescription>{chat.content}</ItemDescription>
              </ItemContent>
              <ItemActions className="self-start">
                <ItemDescription>{chat.createdOn}</ItemDescription>
              </ItemActions>
            </Link>
          </Item>
        ))}
      </ItemGroup>
    </div>
  );
}
