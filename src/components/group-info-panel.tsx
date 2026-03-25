"use client";
import { api } from "@/trpc/react";
import { Avatar } from "./chat-sidebar";
import { useSession } from "@/server/better-auth/client";

export function GroupInfoPanel({ chat, onClose }: { chat: any; onClose: () => void }) {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const myRole = chat.myRole;

  const remove   = api.chat.removeMember.useMutation({ onSuccess: () => void utils.chat.detail.invalidate() });
  const promote  = api.chat.promoteAdmin.useMutation({ onSuccess: () => void utils.chat.detail.invalidate() });

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Group Info</h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Group avatar + name */}
        <div className="flex flex-col items-center gap-2 py-2">
          <Avatar name={chat.name ?? "G"} image={chat.avatar} size="lg" />
          <h3 className="font-black text-gray-900">{chat.name}</h3>
          {chat.description && <p className="text-center text-xs text-gray-500">{chat.description}</p>}
        </div>

        {/* Members */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
            Members ({chat.members.length})
          </p>
          <div className="space-y-2">
            {chat.members.map((m: any) => (
              <div key={m.userId} className="flex items-center gap-3">
                <Avatar name={m.user.name} image={m.user.image} online={m.user.isOnline} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{m.user.name}</p>
                  <p className="text-[10px] capitalize text-gray-400">{m.role}</p>
                </div>
                {(myRole === "owner" || myRole === "admin") && m.userId !== session?.user.id && (
                  <div className="flex gap-1">
                    {myRole === "owner" && m.role === "member" && (
                      <button type="button"
                        onClick={() => promote.mutate({ chatId: chat.id, userId: m.userId })}
                        className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-100">
                        Promote
                      </button>
                    )}
                    <button type="button"
                      onClick={() => remove.mutate({ chatId: chat.id, userId: m.userId })}
                      className="rounded-lg bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-500 hover:bg-red-100">
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Leave group */}
        <button type="button"
          onClick={() => remove.mutate({ chatId: chat.id, userId: session?.user.id ?? "" })}
          className="w-full rounded-xl border border-red-200 py-2 text-sm font-semibold text-red-500 hover:bg-red-50">
          Leave Group
        </button>
      </div>
    </aside>
  );
}
