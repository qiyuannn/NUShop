import {
  Item,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React, { useRef } from "react";
import { useParams } from "react-router-dom";
import { InputGroup, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import type { Message, WSResponse } from "@/types";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { API_URL, WS_URL } from "@/lib/api";
import { useAuth } from "@/context/auth";
import useWebSocket, { ReadyState } from "react-use-websocket";

import { formatMessageTime } from "@/lib/fomatTime";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";

export function Chat() {
  const param = useParams();
  const authApiFetch = useAuthApiFetch();
  const [user, setUser] = React.useState({
    firstName: "",
    lastName: "",
  });
  const [messages, setMessages] = React.useState<Message[]>([]);
  const { token } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  const onMessage = React.useCallback((event: MessageEvent) => {
    const msg = JSON.parse(event.data) as WSResponse;

      if (msg.chatID !== param.userID) {
        return;
      }
      setMessages((p) => [...p, msg.message]);
  },[param.userID])

  const { readyState } = useWebSocket(token ? `${WS_URL}/ws` : null, {
    queryParams: { token: token! },
    share: true,
    shouldReconnect: () => true,
    onOpen: () => {
      console.log("conn open");
    },
    onClose: () => {
      console.log("conn closed");
    },
    onMessage
  });

  React.useEffect(() => {
    async function fetchData() {
      const res2 = await fetch(`${API_URL}/user/${param.userID}`);
      const json2 = await res2.json();
      setUser({ firstName: json2.data.user.firstName, lastName: json2.data.user.lastName });
      console.log(token)
      if (token) {const res1 = await authApiFetch(`${API_URL}/chat/${param.userID}`);
        const json1 = await res1.json();
        setMessages(json1.data.messages);
      }

    }
    fetchData();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div>
        <Item>
          <ItemMedia>
            <Avatar size="lg">
              <AvatarImage src="https://github.com/evilrabbit.png" />
              <AvatarFallback>HI</AvatarFallback>
            </Avatar>
          </ItemMedia>
          <ItemTitle className="font-bold">
            {user.firstName} {user.lastName}
          </ItemTitle>
        </Item>
      </div>
      <Separator/>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!token && 
          <Alert className="w-md mx-auto mt-2" variant="destructive">
            <AlertCircleIcon/>
            <AlertDescription>Log in to chat with this seller</AlertDescription>
          </Alert>
        }
        { token && readyState !== ReadyState.OPEN && readyState !== ReadyState.CONNECTING &&
          <Alert className="w-md mx-auto mt-2" variant="destructive">
            <AlertCircleIcon/>
            <AlertTitle>Not connected to server</AlertTitle>
            <AlertDescription>Try refreshing this page.</AlertDescription>
          </Alert>
        }
        <ItemGroup className="gap-0">
          {messages.map((message) => (
            <Item
              key={message.id}
              className={
                message.senderID == param.userID ? "justify-start p-0.5" : "justify-end p-0.5"
              }
            >
              <div className="line-clamp-none max-w-4/5 p-2 bg-teal-500 rounded-sm">
                <h1 className="text-wrap break-all text-black">{message.content}</h1>
                <h1 className={message.senderID == param.userID ? "" : "ml-auto w-fit"}>
                  {formatMessageTime(message.createdOn)}
                </h1>
              </div>
            </Item>
          ))}
        </ItemGroup>
        <div ref={bottomRef} /> 
      </div>
      <div className="p-2">
        <Message/>
      </div>
    </div>
  );
}

export function Message() {
  const [msg, setMsg] = React.useState("");
  const param = useParams()
  const { token } = useAuth()

  const { sendJsonMessage } = useWebSocket(token ? `${WS_URL}/ws` : null, {
    queryParams: { token: token! },
    share: true,
    shouldReconnect: () => true,
  });

  const handleSend = React.useCallback(() => {
    sendJsonMessage({
      type: "message",
      receiverID: param.userID,
      Content: msg,
    });
    setMsg("");
  }, [msg, sendJsonMessage, param.userID]);

  return (
    <InputGroup>
      <InputGroupInput
        placeholder="Write your message here..."
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          } 
        }}
        disabled={!token}
      />
      <InputGroupButton onClick={handleSend}>Send</InputGroupButton>
    </InputGroup>
  )
}
