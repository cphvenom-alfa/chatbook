import { ChatSidebar } from "@/components/chat-sidebar";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <div className="flex h-full w-full">
      <ChatSidebar />
      {/* Empty state */}
      <div className="hidden flex-1 flex-col items-center justify-center bg-gray-50 md:flex">
        <div className="text-center">
          <span className="mb-4 block text-7xl">💬</span>
          <h2 className="text-xl font-bold text-gray-700">Select a conversation</h2>
          <p className="mt-2 text-sm text-gray-400">
            Choose a chat from the sidebar or start a new one.
          </p>
        </div>
      </div>
    </div>
  );
}

