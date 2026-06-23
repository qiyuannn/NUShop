import { InputGroup, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { useAuth } from "@/context/auth";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { API_URL, WS_URL } from "@/lib/api";
import { formatMessageTime } from "@/lib/fomatTime";
import type { Message, WSMessage } from "@/types";
import React from "react";
import { Link, useParams } from "react-router-dom";
import useWebSocket from "react-use-websocket";

export function Chat() {
  return(
    <div>
      <ChatHeader/>
      <ChatMessages/>
      <ChatInput/>
    </div>
  )
}

export function ChatHeader() {
  const authApiFetch = useAuthApiFetch()
  const param = useParams()
  const [chatInfo, setChatInfo] = React.useState({
    listingID: param.listingID!,
    title: "-",
    otherName: "-",
    image: "",
  })

  React.useEffect(() => {
    async function fetchChatInfo() {
      
        const res = await authApiFetch(`${API_URL}/chat/info/${param.listingID}/${param.otherID}`)
        const json = await res.json()

        if (res.ok) {
          setChatInfo((p) => ({...p, title: json?.data?.title, otherName: json?.data?.otherName, image: json?.data?.image}))
        }
    }
    fetchChatInfo()
  }, [])

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
  )
}

export function ChatMessages() {
  const { token } = useAuth();
  const param = useParams();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const authApiFetch = useAuthApiFetch()

  const onMessage = React.useCallback(
    (event: MessageEvent) => {
      const msg = JSON.parse(event.data) as WSMessage;

      if (msg.type == "message") {
        if (msg.message && msg.message.listingID == param.listingID) {
          setMessages((p) => [...p, msg.message!]);
        }
      }

      if (msg.type == "read") {
        if (msg.read && msg.read.listing_id == param.listingID) {
        }
      }
    },
    [param.listingID],
  );

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
    onMessage,
  });

  React.useEffect(() => {
    async function fetchMessages() {
      const res = await authApiFetch(`${WS_URL}/${param.listingID}/${param.otherID}`)
      const json = await res.json()
      if (res.ok) {
        setMessages(json?.data?.messages ?? [])
      } 
    }
    fetchMessages()
  }, [])

  return (
    <ItemGroup>
      {messages.map((message) => (
        <Item
          key={message.id}
          className={message.senderID == param.otherID ? "justify-start" : "justify-end"}
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
  );
}

export function ChatInput() {
  const { token } = useAuth();
  const param = useParams();
  const [msg, setMsg] = React.useState("");

  const { sendJsonMessage } = useWebSocket(token ? `${WS_URL}/ws` : null, {
    queryParams: { token: token! },
    share: true,
    shouldReconnect: () => true,
    onOpen: () => {
      console.log("conn open");
    },
    onClose: () => {
      console.log("conn closed");
    },
  });

  const handleSend = React.useCallback(() => {
    if (!msg.trim()) {
      return;
    }

    const message: Message = {
      id: "",
      senderID: "",
      receiverID: param.otherID!,
      listingID: param.listingID!,
      content: msg,
      createdOn: "",
    };

    const newWSmessage: WSMessage = {
      type: "message",
      message: message,
    };

    sendJsonMessage(newWSmessage);
    setMsg("");
  }, [param.listingID, param.otherID, msg, sendJsonMessage]);

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
  );
}
