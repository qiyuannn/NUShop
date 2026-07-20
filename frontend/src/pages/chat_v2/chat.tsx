import { ChatHeader } from "@/components/chat/chatHeader";
import { ChatInput } from "@/components/chat/chatInput";
import { ChatMessagesV3 } from "@/components/chat/chatMessagesV3";

export function Chat() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-[calc(100vw-4rem)]">
      <div>
        <ChatHeader />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ChatMessagesV3 />
      </div>
      <div className="p-2">
        <ChatInput />
      </div>
    </div>
  );
}
