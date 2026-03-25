"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/trpc/react";
import { usePusher } from "@/hooks/use-pusher";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Avatar } from "./chat-sidebar";
import { GroupInfoPanel } from "./group-info-panel";
import { useSession } from "@/server/better-auth/client";

export function ChatWindow({ chatId }: { chatId: string }) {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showInfo, setShowInfo] = useState(false);

  const { data: chatDetail }   = api.chat.detail.useQuery({ chatId });
  const { data: messages = [], refetch } = api.message.list.useQuery({ chatId, limit: 50 });
  const markRead = api.chat.markRead.useMutation();

  // Mark chat as read on open
  useEffect(() => {
    markRead.mutate({ chatId });
    void utils.chat.myChats.invalidate();
  }, [chatId, markRead.mutate, utils.chat.myChats.invalidate]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Real-time: Pusher
  usePusher(`chat-${chatId}`, {
    "new-message": (data: any) => {
      void utils.message.list.invalidate({ chatId });
      void utils.chat.myChats.invalidate();
    },
    "message-deleted": (data: any) => {
      void utils.message.list.invalidate({ chatId });
    },
    "message-read": (data: any) => {
      void utils.message.list.invalidate({ chatId });
    },
  });

  if (!chatDetail) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  const isGroup = chatDetail.type === "group";
  const otherMember = isGroup
    ? null
    : chatDetail.members.find(m => m.userId !== session?.user.id);

  const headerName  = isGroup ? chatDetail.name ?? "Group" : otherMember?.user.name ?? "Unknown";
  const headerImage = isGroup ? chatDetail.avatar : otherMember?.user.image;
  const isOnline    = !isGroup && (otherMember?.user.isOnline ?? false);
  const subtitle    = isGroup
    ? `${chatDetail.members.length} members`
    : isOnline ? "Online" : otherMember?.user.lastSeen
      ? `Last seen ${new Date(otherMember.user.lastSeen).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
      : "Offline";

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col bg-gray-50">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <Avatar name={headerName} image={headerImage} online={isOnline} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{headerName}</p>
            <p className={`text-xs ${isOnline ? "text-green-500" : "text-gray-400"}`}>{subtitle}</p>
          </div>
          <button type="button" onClick={() => setShowInfo(v => !v)}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100" title="Info">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {messages.map((msg: any) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === session?.user.id}
              showAvatar={isGroup}
              onReply={() => setReplyTo(msg)}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-2">
            <div className="flex-1 rounded-xl bg-gray-100 px-3 py-2 min-w-0">
              <p className="text-[10px] font-bold text-green-600">{replyTo.sender?.name}</p>
              <p className="text-xs text-gray-600 truncate">{replyTo.content ?? `${replyTo.type}`}</p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)}
              className="text-gray-400 hover:text-gray-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Input */}
        <MessageInput
          chatId={chatId}
          replyToId={replyTo?.id}
          onSent={() => setReplyTo(null)}
        />
      </div>

      {/* Group info panel */}
      {showInfo && isGroup && (
        <GroupInfoPanel chat={chatDetail as any} onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
}

