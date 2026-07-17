import { useAuthStore } from "@/context/authStoreV2";
import type { TypeMessage, WSMessage } from "@/types";
import React from "react";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScrollerVisibility,
} from "../ui/message-scroller";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { useParams } from "react-router-dom";
import { API_URL, WS_URL } from "@/lib/api";
import { Message, MessageContent, MessageFooter } from "../ui/message";
import { Bubble, BubbleContent } from "../ui/bubble";
import useWebSocket from "react-use-websocket";
import throttle from "lodash.throttle";
import { formatMessageTime } from "@/lib/fomatTime";
import { CheckCheck } from "lucide-react";

const MessageRowMemo = React.memo(function MessageRow({
  msg,
  isSelf,
  isRead,
}: {
  msg: TypeMessage;
  isSelf: boolean;
  isRead: boolean;
}) {
  return (
    <MessageScrollerItem key={msg.id} messageId={msg.id}>
      <Message align={isSelf ? "end" : "start"}>
        <MessageContent>
          <Bubble variant={"secondary"}>
            <BubbleContent className="rounded-4xl">
              {msg.content}
              <MessageFooter className="px-0 gap-1">
                {formatMessageTime(msg.createdOn)}
                {isSelf && isRead && <CheckCheck size={15} />}
              </MessageFooter>
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
});

function ChatMessagesComponenet() {
  const token = useAuthStore((s) => s.token);
  const userID = useAuthStore((s) => s.userID);
  const authApiFetch = useAuthApiFetch();
  const param = useParams();

  const [messages, setMessages] = React.useState<TypeMessage[]>([]);
  const [otherLastReadID, setOtherLastReadID] = React.useState("");
  const [selfLastReadID, setSelfLastReadID] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const seenRef = React.useRef<Set<string>>(new Set());
  const pendingReadRef = React.useRef<string>("");
  const messageIndexRef = React.useRef<Map<string, number>>(new Map());

  const { visibleMessageIds } = useMessageScrollerVisibility();

  //WS connection
  const onMessage = React.useCallback(
    (event: MessageEvent) => {
      const msg = JSON.parse(event.data) as WSMessage;
      if (msg.type == "message") {
        if (msg.message && msg.message.listingID == param.listingID) {
          setMessages((p) => {
            const next = [...p, msg.message!];
            messageIndexRef.current.set(msg.message!.id, p.length);
            return next;
          });
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
    onMessage,
  });

  //Read - 1
  const otherLastReadIndex = messageIndexRef.current.get(otherLastReadID) ?? -1;

  //Read - 2
  const selfLastReadIndex = messageIndexRef.current.get(selfLastReadID) ?? -1;

  const sendRead = React.useCallback(() => {
    if (!pendingReadRef.current) {
      return;
    }
    const readMsg: WSMessage = {
      type: "read",
      read: {
        userID: "",
        otherID: param.otherID!,
        listingID: param.listingID!,
        lastReadID: pendingReadRef.current,
      },
    };
    sendJsonMessage(readMsg);
    pendingReadRef.current = "";
  }, [param.otherID, param.listingID]);

  const throttleFn = React.useMemo(
    () => throttle(sendRead, 300, { leading: true, trailing: true }),
    [sendRead],
  );

  React.useEffect(() => () => throttleFn.cancel(), [throttleFn]);

  React.useEffect(() => {
    visibleMessageIds.forEach((id) => {
      if (seenRef.current.has(id)) {
        return;
      }
      seenRef.current.add(id);
      const currIndex = messageIndexRef.current.get(id) ?? -1;
      if (currIndex > selfLastReadIndex && messages[currIndex].senderID != userID) {
        setSelfLastReadID(id);
        pendingReadRef.current = id;
        throttleFn();
      }
    });
  }, [visibleMessageIds, messages, selfLastReadIndex, userID, throttleFn]);

  //load history
  React.useEffect(() => {
    setErr(null);
    setLoading(true);
    async function fetchMessages() {
      try {
        const res = await authApiFetch(`${API_URL}/chat/${param.listingID}/${param.otherID}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
        }
        setMessages(json?.data?.messages ?? []);
        setOtherLastReadID(json?.data?.otherLastReadID ?? "");
        setSelfLastReadID(json?.data?.selfLastReadID ?? "");
        const map = new Map<string, number>();
        (json?.data?.messages ?? []).forEach((m: TypeMessage, i: number) => map.set(m.id, i));
        messageIndexRef.current = map;
      } catch (error) {
        setErr(error instanceof Error ? error.message : "INTERNAL_ERROR");
      } finally {
        setLoading(true);
      }
    }
    fetchMessages();
  }, []);

  return (
    <MessageScrollerContent className="gap-1 p-1">
      {messages.map((msg, i) => (
        <MessageRowMemo
          key={msg.id}
          msg={msg}
          isSelf={msg.senderID == userID}
          isRead={i <= otherLastReadIndex}
        />
      ))}
    </MessageScrollerContent>
  );
}

export function ChatMessagesV3() {
  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller>
        <MessageScrollerViewport>
          <ChatMessagesComponenet />
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
