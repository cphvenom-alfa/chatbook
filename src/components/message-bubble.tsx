"use client";
import { useState } from "react";
import { api } from "@/trpc/react";
import { Avatar } from "./chat-sidebar";

type Message = {
  id: string; content: string | null; type: string; fileUrl: string | null;
  fileName: string | null; isDeleted: boolean; createdAt: Date;
  sender: { id: string; name: string; image: string | null };
  replyTo?: { id: string; content: string | null; sender: { name: string } } | null;
  reads: { userId: string; readAt: Date }[];
};

export function MessageBubble({
  message, isOwn, showAvatar, onReply,
}: {
  message: Message; isOwn: boolean; showAvatar: boolean; onReply: () => void;
}) {
  const utils = api.useUtils();
  const [showActions, setShowActions] = useState(false);

  const del = api.message.delete.useMutation({
    onSuccess: () => void utils.message.list.invalidate(),
  });

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
        <span className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs italic text-gray-400">
          🚫 Message deleted
        </span>
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
<div
      className={`group flex items-end gap-2 mb-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showAvatar && !isOwn && (
        <Avatar name={message.sender.name} image={message.sender.image} size="sm" />
      )}

      <div className={`flex flex-col max-w-xs lg:max-w-md ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender name in groups */}
        {showAvatar && !isOwn && (
          <p className="mb-1 px-1 text-[10px] font-bold text-green-600">{message.sender.name}</p>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div className={`mb-1 rounded-lg border-l-4 border-green-500 px-3 py-1 text-xs ${isOwn ? "bg-green-100" : "bg-gray-200"}`}>
            <p className="font-bold text-green-700">{message.replyTo.sender?.name}</p>
            <p className="text-gray-600 truncate">{message.replyTo.content ?? "..."}</p>
          </div>
        )}

        {/* Bubble */}
        <div className={`relative rounded-2xl px-4 py-2.5 shadow-sm ${
          isOwn
            ? "rounded-br-sm bg-green-500 text-white"
            : "rounded-bl-sm bg-white text-gray-800"
        }`}>
          {/* Image */}
          {message.type === "image" && message.fileUrl && (
            // biome-ignore lint/performance/noImgElement: <explanation>
// biome-ignore lint/a11y/noRedundantAlt: <explanation>
<img src={message.fileUrl} alt="Image" className="mb-2 max-h-48 rounded-xl object-cover" />
          )}
          {/* File */}
          {message.type === "file" && message.fileUrl && (
            <a href={message.fileUrl} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-2 text-xs underline ${isOwn ? "text-green-100" : "text-blue-600"}`}>
              📎 {message.fileName ?? "File"}
            </a>
          )}
          {/* Text */}
          {message.content && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
          )}

          {/* Time + read receipt */}
          <div className={`mt-1 flex items-center gap-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            <span className={`text-[10px] ${isOwn ? "text-green-100" : "text-gray-400"}`}>
              {new Date(message.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isOwn && (
              <span className="text-[10px] text-green-100">
                {message.reads.length > 0 ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="flex flex-col gap-1">
          <button type="button" onClick={onReply}
            className="rounded-full bg-gray-100 p-1 text-gray-500 hover:bg-gray-200" title="Reply">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          {isOwn && (
            <button type="button" onClick={() => del.mutate({ messageId: message.id })}
              className="rounded-full bg-gray-100 p-1 text-red-400 hover:bg-red-50" title="Delete">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
