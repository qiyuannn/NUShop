import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { API_URL, WS_URL } from "@/lib/api";
import { formatMessageTime } from "@/lib/fomatTime";
import type { lastMessage, WSResponse } from "@/types";
import React from "react";
import { Link } from "react-router-dom";
import useWebSocket from "react-use-websocket";
import { toast } from "sonner";

export function ChatMain() {
  return (
    <div className="h-full w-full flex flex-col">
      <Item>
        <ItemContent>
          <ItemTitle className="font-bold text-2xl">Chat</ItemTitle>
          <ItemDescription>View your conversations here</ItemDescription>
        </ItemContent>
      </Item>
      <Separator />
      <div className="flex-1">
        <ChatList />
      </div>
    </div>
  );
}

export function ChatList() {
  const { token } = useAuth();
  const authApiFetch = useAuthApiFetch();
  const [_, setErr] = React.useState(false);
  const [lastMessages, setLastMessages] = React.useState<lastMessage[]>([]);

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
      const msg = JSON.parse(event.data) as WSResponse;
      if (msg.error) {
        return;
      }

      var updated = false;
      setLastMessages((p) => {
        const existing = p.find((message) => message.chatID == msg.chatID);
        if (existing) {
          updated = true;
          const updatedChat = {
            ...existing,
            lastMessage: msg.message.content,
            lastMessageOn: msg.message.createdOn,
          };
          return [updatedChat, ...p.filter((message) => message.chatID != msg.chatID)];
        }
        return p;
      });

      if (!updated) {
        try {
          const res = await authApiFetch(`${API_URL}/user/${msg.chatID}`);
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
          }
          const newChat: lastMessage = {
            chatID: msg.chatID,
            username: json?.data?.user?.username ?? "Failed to load username",
            lastMessage: msg.message.content,
            lastMessageSender: msg.message.senderID,
            lastMessageOn: msg.message.createdOn,
            read: msg.message.read,
          };
          setLastMessages((p) => [...p, newChat]);
        } catch {
          toast.error("failed to update new message");
        }
      }
    },
  });

  React.useEffect(() => {
    setErr(false);
    async function getConversations() {
      try {
        const res = await authApiFetch(`${API_URL}/chat`, {
          method: "GET",
        });
        const json = await res.json();
        console.log(json);
        if (!res.ok) {
          throw new Error(json?.error?.code ?? `INTERNAL_ERROR`);
        }
        setLastMessages(json?.data?.conversations ?? []);
      } catch {
        setErr(true);
      }
    }
    getConversations();
  }, []);

  if (lastMessages.length == 0 && token) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p>No conversations available</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p>Log in to view your conversations</p>
      </div>
    );
  }

  return (
    <ItemGroup>
      {lastMessages.map((message) => (
        <Item asChild key={message.chatID}>
          <Link to={`/chat/${message.chatID}`}>
            <ItemMedia>
              <Avatar size="lg">
                <AvatarImage src="https://github.com/evilrabbit.png" />
                <AvatarFallback>HI</AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent className="gap-0">
              <ItemTitle className="font-bold">
                {message.username}
              </ItemTitle>
              <ItemDescription className="overflow-wrap break-all">
                {message.lastMessage}
              </ItemDescription>
            </ItemContent>
            <ItemContent>
              <ItemTitle>{formatMessageTime(message.lastMessageOn)}</ItemTitle>
            </ItemContent>
          </Link>
        </Item>
      ))}
    </ItemGroup>
  );
}
