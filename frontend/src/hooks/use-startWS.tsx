import { useAuth } from "@/context/auth";
import { WS_URL } from "@/lib/api";
import { Radical } from "lucide-react";
import React from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

export function useStartWS() {
  const { token } = useAuth();
  const connected = React.useRef(false);

  const { lastJsonMessage, sendJsonMessage, readyState } = useWebSocket(
    `${WS_URL}/ws`,
    {
      queryParams: { token: token ?? "" },
      share: true,
      onOpen: () => console.log("ws opened"),
      onClose: () => console.log("conn closed"),
      onError: () => {
        console.log("error");
      },
    },
    token !== null && !connected.current,
  );

  React.useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      connected.current = true;
    }
  }, [readyState]);

  return { lastJsonMessage, sendJsonMessage, readyState };
}
