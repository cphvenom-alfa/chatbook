"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

export function NewGroupDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name,  setName]  = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string }[]>([]);
  const { data: users = [] } = api.profile.search.useQuery({ query }, { enabled: query.length > 0 });

  const create = api.chat.createGroup.useMutation({
    onSuccess: (chat) => { router.push(`/chat/${chat!.id}`); onClose(); },
  });

  function toggle(u: { id: string; name: string }) {
    setSelected(prev =>
      prev.find(s => s.id === u.id) ? prev.filter(s => s.id !== u.id) : [...prev, u]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">New Group</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-3">
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-green-400 focus:outline-none"
            placeholder="Group name..."
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-green-400 focus:outline-none"
            placeholder="Search members..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(s => (
                <span key={s.id} className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                  {s.name}
                  <button type="button" onClick={() => toggle(s)} className="text-green-500 hover:text-green-700">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {users.map(u => (
              <button key={u.id} type="button" onClick={() => toggle(u)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-50 text-left ${selected.find(s => s.id === u.id) ? "bg-green-50" : ""}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm text-gray-800">{u.name}</p>
                {selected.find(s => s.id === u.id) && <span className="ml-auto text-green-500 font-bold">✓</span>}
              </button>
            ))}
          </div>
          <button type="button"
            onClick={() => create.mutate({ name, memberIds: selected.map(s => s.id) })}
            disabled={!name || selected.length === 0 || create.isPending}
            className="w-full rounded-xl bg-green-500 py-2.5 text-sm font-bold text-white hover:bg-green-400 disabled:opacity-50">
            {create.isPending ? "Creating..." : `Create Group (${selected.length} members)`}
          </button>
        </div>
      </div>
    </div>
  );
}
