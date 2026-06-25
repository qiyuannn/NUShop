import { InputGroup, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { useAuth } from "@/context/auth";
import { WS_URL } from "@/lib/api";
import React from "react";
import { useParams } from "react-router-dom";
import useWebSocket from "react-use-websocket";

export function ChatInput() {
  const { token } = useAuth();
  const param = useParams();
  const [msg, setMsg] = React.useState("");
  

  const { sendJsonMessage } = useWebSocket(token ? `${WS_URL}/ws` : null, {
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
  });

  const handleSend = React.useCallback(() => {
    if (!msg.trim()) {
      return;
    }

    const newWSmessage = {
      type: "message",
      message: {
        receiverID: param.otherID!,
        listingID: param.listingID!,
        content: msg,
      },
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
