import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { useAuthStore } from "@/context/authStoreV2";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { API_URL, WS_URL } from "@/lib/api";
import { formatMessageTime } from "@/lib/fomatTime";
import type { chat, WSMessage } from "@/types";
import { Package } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import useWebSocket from "react-use-websocket";

export function ChatDirectoryMain() {
  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <Item>
        <ItemContent>
          <ItemTitle className="font-bold text-2xl">Chats</ItemTitle>
          <ItemDescription>View your conversations here</ItemDescription>
        </ItemContent>
      </Item>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ChatDirectory />
      </div>
    </div>
  );
}

export function ChatDirectory() {
  const token = useAuthStore((s) => s.token);
  const authApiFetch = useAuthApiFetch();
  const [chats, setChats] = React.useState<chat[]>([]);
  const [, setErr] = React.useState(false);

  useWebSocket(token ? `${WS_URL}/ws` : null, {
    queryParams: { token: token! },
    share: true,
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: (attemptNumber) =>
      Math.min(Math.pow(2, attemptNumber) * 1000, 10000),
    onOpen: () => {
      console.log("conn open");
    },
    onClose: () => {
      console.log("conn closed");
    },
    onMessage: async (event: MessageEvent) => {
      const msg = JSON.parse(event.data) as WSMessage;

      if (msg.type !== "message" || msg.message == undefined) {
        return;
      }
      const message = msg.message;

      let updated = false;

      setChats((p) => {
        const existing = p.find(
          (chat) =>
            chat.listingID == message.listingID &&
            (chat.otherID == message.senderID || chat.otherID == message.receiverID),
        );

        if (!existing) {
          return p;
        }

        updated = true;

        const newChat: chat = {
          ...existing,
          content: message.content ?? "",
          createdOn: message.createdOn ?? "",
          unreadCount: (existing.unreadCount ?? 0) + 1,
        };

        return [newChat, ...p.filter((chat) => chat.listingID !== message.listingID)];
      });

      if (!updated) {
        const res = await authApiFetch(
          `${API_URL}/chat/info/${message.listingID}/${message.senderID}/${message.receiverID}`,
        );
        const json = await res.json();

        const newChat: chat = {
          listingID: message.listingID,
          title: json?.data?.title ?? "Failed to load title",
          content: message.content,
          createdOn: message.createdOn,
          otherName: json?.data?.otherName ?? "Failed to load username",
          otherID: json?.data?.otherID ?? "Failed to load ID",
          image: json?.data?.image ?? "",
          unreadCount: 1,
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
      } catch {
        setErr(true);
      }
    }
    getChats();
  }, []);

  if (chats.length == 0) {
    return (
      <Empty className="h-full w-full items-center justify-center">
        <EmptyHeader>
          <EmptyTitle>No chats yet</EmptyTitle>
          <EmptyDescription>Start a chat by clicking "Chat with Seller" on a listing.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div>
      <ItemGroup>
        {chats.map((chat) => (
          <Item key={chat.listingID + chat.otherID} asChild>
            <Link to={`/chat/${chat.listingID}/${chat.otherID}`}>
              <ItemMedia>
                {!chat.image ? (
                  <div className="aspect-square border rounded-lg w-full flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <Package className="mx-auto h-10 w-17 opacity-50" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={chat.image.startsWith("http") ? chat.image : `${API_URL}${chat.image}`}
                    className="aspect-square object-cover border rounded-sm w-17"
                  />
                )}
              </ItemMedia>
              <ItemContent className="gap-0">
                <ItemDescription>{chat.otherName}</ItemDescription>
                <ItemTitle className="font-bold text-xl">{chat.title}</ItemTitle>
                <ItemDescription className="overflow-wrap break-all">
                  {chat.content}
                </ItemDescription>
              </ItemContent>
              <ItemActions className="self-start flex flex-col items-end gap-1">
                <ItemDescription>{formatMessageTime(chat.createdOn)}</ItemDescription>

                {(chat.unreadCount ?? 0) > 0 && (
                  <div className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    {chat.unreadCount ?? 0}
                  </div>
                )}
              </ItemActions>
            </Link>
          </Item>
        ))}
      </ItemGroup>
    </div>
  );
}
