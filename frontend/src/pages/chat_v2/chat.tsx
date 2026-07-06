import { ChatHeader } from "@/components/chat/chatHeader";
import { ChatInput } from "@/components/chat/chatInput";
import { ChatMessages } from "@/components/chat/chatMessagesV2";
import { useAuthStore } from "@/context/authStoreV2";
import { useParams } from "react-router-dom";

export function Chat() {
  const userID = useAuthStore.getState().userID;
  const param = useParams();

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {userID == param.otherID && (
        <div className="h-12 flex items-center justify-center bg-yellow-50">
          <p className="text-muted-foreground">This is your own listing</p>
        </div>
      )}

      <div>
        <ChatHeader />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ChatMessages />
      </div>
      <div className="p-2">
        <ChatInput />
      </div>
    </div>
  );
}
