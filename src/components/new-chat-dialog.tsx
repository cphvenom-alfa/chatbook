"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

export function NewChatDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data: users = [] } = api.profile.search.useQuery({ query }, { enabled: query.length > 0 });

  const getOrCreate = api.chat.getOrCreateDirect.useMutation({
    onSuccess: (chat) => { router.push(`/chat/${chat!.id}`); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">New Chat</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-3">
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-green-400 focus:outline-none"
            placeholder="Search by name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            // biome-ignore lint/a11y/noAutofocus: <explanation>
            autoFocus
          />
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {users.map(u => (
              <button key={u.id} type="button"
                onClick={() => getOrCreate.mutate({ targetUserId: u.id })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 text-left">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 font-bold text-green-700 text-sm overflow-hidden">
                  {u.image ? <img src={u.image} alt={u.name} className="h-full w-full object-cover" /> : u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                  <p className="text-[10px] text-gray-400">{u.status}</p>
                </div>
                {u.isOnline && <span className="ml-auto h-2 w-2 rounded-full bg-green-500" />}
              </button>
            ))}
            {query && users.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">No users found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
