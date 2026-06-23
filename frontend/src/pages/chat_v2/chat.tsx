import { ChatHeader } from "@/components/chat/chatHeader";
import { ChatInput } from "@/components/chat/chatInput";
import { ChatMessages } from "@/components/chat/chatMessagesV2";

export function Chat() {
  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div>
        <ChatHeader/>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ChatMessages/>
      </div>
      <div className="p-2">
        <ChatInput/>
      </div>
    </div> 
  );
}
