import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { Message, WSMessage } from "./types";
import { LoginPage } from "./pages/login";
import { SignupPage } from "./pages/signup";
import { ForgotPasswordPage } from "./pages/forgotPassword";
import { Layout } from "./components/layout";
import { EditListingPage } from "./pages/editListing";
import { HomePage } from "./pages/home";
import { ManageListing } from "./pages/manageListing";
import { CreateListingPage } from "./pages/createListing";
import { Listing } from "./pages/listingItem";
import { ProfilePage } from "./pages/profile";
import React from "react";
import { useCartStore } from "./context/cartStore";
import { useAuthApiFetch } from "./hooks/use-authApiFetch";
import { useAuth } from "./context/auth";
import { toast } from "sonner";
import { CartPage } from "./pages/cart";
import { WS_URL } from "./lib/api";
import useWebSocket from "react-use-websocket";
import { ChatDirectoryMain } from "./pages/chat_v2/chatDirectory";
import { Chat } from "./pages/chat_v2/chat";

function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null;

  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded)) as { sub?: string };
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

async function playChatSound(audioContextRef: React.MutableRefObject<AudioContext | null>) {
  if (typeof window === "undefined") return;

  if (!audioContextRef.current) {
    audioContextRef.current = new window.AudioContext();
  }

  const ctx = audioContextRef.current;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    gain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 0.24);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, now + 0.05);
    osc2.connect(gain);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.27);
  } catch {
    return;
  }
}

export function App() {
  const initCart = useCartStore((state) => state.initCart);
  const authApiFetch = useAuthApiFetch();
  const { token } = useAuth();
  const location = useLocation();
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const userId = React.useMemo(() => getUserIdFromToken(token), [token]);

  React.useEffect(() => {
    if (!token || !("Notification" in window)) return;

    const unlockAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new window.AudioContext();
      }

      if (audioContextRef.current.state === "suspended") {
        void audioContextRef.current.resume().catch(() => { });
      }
    };

    const requestPermission = () => {
      if (Notification.permission === "default") {
        void Notification.requestPermission();
      }
    };

    const handleFirstInteraction = () => {
      requestPermission();
      unlockAudio();
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [token]);

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
    onMessage: (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;

        if (msg.type !== "message" || !msg.message || !userId) {
          return;
        }

        const message: Message = msg.message;

        if (message.senderID === userId) {
          return;
        }

        const match = location.pathname.match(/^\/chat\/([^/]+)\/([^/]+)$/);
        const isCurrentChat =
          !!match && match[1] === message.listingID && match[2] === message.senderID;


        if (document.visibilityState === "visible" && isCurrentChat) {
          return;
        }

        if ("Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("New chat message", {
              body:
                message.content.length > 120
                  ? `${message.content.slice(0, 117)}...`
                  : message.content,
            });
          } else if (Notification.permission === "default") {
            void Notification.requestPermission();
          }
        }

        void playChatSound(audioContextRef);
      } catch {
        return
      }
    },
  });

  React.useEffect(() => {
    if (!token) {
      return;
    }

    async function initcart() {
      try {
        await initCart(authApiFetch);
      } catch (error) {
        if (error instanceof Error) {
          toast.error("Failed to initialise cart");
        }
      }
    }

    initcart();
  }, [token]);

  return (
    <Routes>
      <Route path="/login" element={false ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/listings/:listingID/edit" element={<EditListingPage />} />
        <Route path="/listings/create" element={<CreateListingPage />} />
        <Route path="/listings/manage" element={<ManageListing />} />
        <Route path="/listing/:listingID" element={<Listing />} />
        <Route path="/user/:userID" element={<ProfilePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/chat" element={<ChatDirectoryMain />} />
        <Route path="/chat/:listingID/:otherID" element={<Chat />} />

        <Route path="/test" element={<CartPage />} />
      </Route>
    </Routes>
  );
}

export default App;
