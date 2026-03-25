import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatWindow } from "@/components/chat-window";

export const dynamic = "force-dynamic";

export default async function ChatWindowPage({
  params,
}: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;

  return (
    <div className="flex h-full w-full">
      <ChatSidebar activeChatId={chatId} />
      <ChatWindow chatId={chatId} />
    </div>
  );
}
