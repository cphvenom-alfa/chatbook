"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { signOut } from "@/server/better-auth/client";
import { NewChatDialog } from "./new-chat-dialog";
import { NewGroupDialog } from "./new-group-dialog";

function Avatar({ name, image, online, size = "md" }: {
  name: string; image?: string | null; online?: boolean; size?: "sm" | "md" | "lg";
}) {
  const sz = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-xl" : "h-10 w-10 text-sm";
  return (
    <div className={`relative shrink-0 ${sz}`}>
      <div className={`flex h-full w-full items-center justify-center rounded-full bg-green-100 font-bold text-green-700 overflow-hidden ${sz}`}>
        {image
          ? <img src={image} alt={name} className="h-full w-full object-cover" />
          : name.charAt(0).toUpperCase()}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${online ? "bg-green-500" : "bg-gray-300"} ${size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"}`} />
      )}
    </div>
  );
}

export { Avatar };

export function ChatSidebar({ activeChatId }: { activeChatId?: string }) {
  const router = useRouter();
  const { data: myChats = [], isLoading } = api.chat.myChats.useQuery(undefined, { refetchInterval: 5000 });
  const { data: profile } = api.profile.me.useQuery();
  const { data: notifCount } = api.notification.unreadCount.useQuery();
  const [showNewChat, setShowNewChat]   = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = myChats.filter(m => {
    const chatName = m.chat.type === "direct"
      ? m.chat.members.find(mem => mem.userId !== profile?.id)?.user.name ?? ""
      : m.chat.name ?? "";
    return chatName.toLowerCase().includes(search.toLowerCase());
  });

  function getChatDisplay(m: any) {
    if (m.chat.type === "group") {
      return {
        name:   m.chat.name ?? "Group",
        image:  m.chat.avatar,
        online: false,
        isGroup: true,
      };
    }
    const other = m.chat.members.find((mem: any) => mem.userId !== profile?.id);
    return {
      name:    other?.user.name  ?? "Unknown",
      image:   other?.user.image ?? null,
      online:  other?.user.isOnline ?? false,
      isGroup: false,
    };
  }

  function formatTime(date: Date | string | null) {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <>
      <aside className="flex h-full w-full flex-col border-r border-gray-200 bg-white md:w-80 shrink-0">
        {/* Header */}
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-500 text-base">💬</div>
              <span className="font-black text-gray-900">Chat<span className="text-green-500">App</span></span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setShowNewGroup(true)} title="New group"
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100" >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button type="button" onClick={() => setShowNewChat(true)} title="New chat"
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button type="button"
                onClick={() => signOut().then(() => router.push("/sign-in"))}
                title="Sign out"
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="w-full rounded-xl bg-gray-100 py-2 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="Search chats..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center px-4">
              <span className="mb-3 text-4xl">💬</span>
              <p className="text-sm text-gray-400">No chats yet. Start one!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(m => {
                const display = getChatDisplay(m);
                const lastMsg = m.chat.messages[0];
                const isActive = activeChatId === m.chatId;
                return (
                  <Link key={m.chatId} href={`/chat/${m.chatId}`}
                    className={`flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50 ${isActive ? "bg-green-50" : ""}`}>
                    <Avatar name={display.name} image={display.image} online={display.online} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold truncate ${isActive ? "text-green-700" : "text-gray-900"}`}>
                          {display.name}
                        </p>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                          {formatTime(lastMsg?.createdAt ?? null)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-500 truncate">
                          {lastMsg?.isDeleted ? (
                            <span className="italic text-gray-400">Message deleted</span>
                          ) : lastMsg?.content ? (
                            <>
                              {lastMsg.sender?.id === profile?.id && "You: "}
                              {lastMsg.content.slice(0, 40)}
                            </>
                          ) : lastMsg?.type ? (
                            <span className="italic">
                              {lastMsg.type === "image" ? "📷 Image" : lastMsg.type === "file" ? "📎 File" : "🔊 Audio"}
                            </span>
                          ) : (
                            <span className="italic text-gray-400">No messages yet</span>
                          )}
                        </p>
                        {m.unreadCount > 0 && (
                          <span className="ml-2 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold text-white">
                            {m.unreadCount > 99 ? "99+" : m.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Profile footer */}
        {profile && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3">
            <Avatar name={profile.name} image={profile.image} online={true} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{profile.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{profile.status}</p>
            </div>
          </div>
        )}
      </aside>

      {showNewChat  && <NewChatDialog  onClose={() => setShowNewChat(false)}  />}
      {showNewGroup && <NewGroupDialog onClose={() => setShowNewGroup(false)} />}
    </>
  );
}
