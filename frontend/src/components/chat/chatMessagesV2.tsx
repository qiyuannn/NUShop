import { useAuth } from "@/context/auth";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { API_URL, WS_URL } from "@/lib/api";
import type { Message, WSMessage } from "@/types";
import React from "react";
import { useParams } from "react-router-dom";
import useWebSocket from "react-use-websocket";
import throttle from "lodash.throttle"
import { Item, ItemGroup } from "../ui/item";
import { formatMessageTime } from "@/lib/fomatTime";
import { Check } from "lucide-react";

export function ChatMessages() {
  const { token } = useAuth()
  const param = useParams()
  const authApiFetch = useAuthApiFetch()

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loadErr, setLoadErr] = React.useState(false)
  const [otherLastReadID, setOtherLastReadID] = React.useState("");
  const [selfLastReadID, setSelfLastReadID] = React.useState("")

  const messageRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())
  const pendingReadID = React.useRef<string>("")

  const bottomRef = React.useRef<HTMLDivElement>(null);

  const onMessage = React.useCallback(
    (event: MessageEvent) => {
      const msg = JSON.parse(event.data) as WSMessage;

      if (msg.type == "message") {
        if (msg.message && msg.message.listingID == param.listingID) {
          setMessages((p) => [...p, msg.message!]);
        }
      }

      if (msg.type == "read") {
        if (msg.read && msg.read.listingID == param.listingID) {
          if (msg.read.userID == param.otherID) {
            setOtherLastReadID(msg.read.lastReadID);
          }
        }
      }
    },
    [param.listingID],
  );

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
    onMessage
  });

  // Other person reads my messages
  const otherLastReadIndex = React.useMemo(
    () => messages.findIndex((m) => m.id == otherLastReadID),
    [messages, otherLastReadID],
  );

  // I read other person messages
  const selfLastReadIndex = React.useMemo(
    () => messages.findIndex((m) => m.id == selfLastReadID),
    [messages, selfLastReadID],
  );

  const sendRead = React.useCallback(
    
    () => {
      if (!pendingReadID.current) {
        return
      }
      const readMsg: WSMessage = {
        type: "read",
        read: {
          userID: "",
          otherID: param.otherID!,
          listingID: param.listingID!,
          lastReadID: pendingReadID.current
        }
      }

      sendJsonMessage(readMsg)
      pendingReadID.current = ""
    }, [param.otherID, param.listingID]
  )

  const throttleFn = React.useMemo(
    () => throttle(sendRead, 300, { leading: true, trailing: true })
  , [sendRead])

  React.useEffect(() => () => throttleFn.cancel(), [throttleFn]);

  React.useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        
        const id = entry.target.getAttribute("data-message-id")
        const currIndex = messages.findIndex((m) => m.id == id)

        if (currIndex > selfLastReadIndex) {
          setSelfLastReadID(id!)
          pendingReadID.current = id!
          throttleFn()
        }

        observer.unobserve(entry.target)
      })
    }, {threshold: 0.5})

    messageRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [messages, selfLastReadIndex, throttleFn])


  // on load
  React.useEffect(() => {
    setLoadErr(false)
    async function fetchData() {
      try {
        const res = await authApiFetch(`${API_URL}/chat/${param.listingID}/${param.otherID}`)
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR")
        }
        setMessages(json?.data?.messages ?? [])
        setOtherLastReadID(json?.data?.otherLastReadID ?? "")
        setSelfLastReadID(json?.data?.selfLastReadID ?? "")
      } catch {
        setLoadErr(true)
      }
    }
    fetchData()
  }, [])

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);


  return (
    <div>
      <ItemGroup className="gap-0">
        {messages.map((message, i) => {
          const otherMessage = message.senderID == param.otherID;
          const isRead = !otherMessage && i <= otherLastReadIndex;

          return (
            <Item
            key={message.id}
            data-message-id={message.id}
            ref={(el) => {
              if (otherMessage) {
                if (el) {messageRefs.current.set(message.id, el);}
                else {messageRefs.current.delete(message.id); }
              }
            }}
            className={otherMessage ? "justify-start p-1" : "justify-end p-1"}
            >
              <div className="line-clamp-none max-w-4/5 p-2 bg-teal-500 rounded-sm">
                <h1 className="text-wrap break-all text-black">{message.content}</h1>
                <h1 className={otherMessage ? "" : "ml-auto w-fit"}>
                  {formatMessageTime(message.createdOn)}
                </h1>
              </div>
              {isRead && <Check size={15}/>}
            </Item>
          );
        })}
      </ItemGroup>  
       <div ref={bottomRef} />
    </div>
  )
}