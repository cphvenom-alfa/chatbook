"use client";
import { useState, useRef } from "react";
import { api } from "@/trpc/react";
import { useUploadThing } from "@/utils/uploadthing";

export function MessageInput({
  chatId, replyToId, onSent,
}: { chatId: string; replyToId?: string; onSent: () => void }) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const send = api.message.send.useMutation({
    onSuccess: () => {
      setText("");
      onSent();
      void utils.message.list.invalidate({ chatId });
      void utils.chat.myChats.invalidate();
    },
  });

  const { startUpload } = useUploadThing("chatFile", {
    onClientUploadComplete: (res: any[]) => {
      const file = res[0];
      if (file) {
        const isImage = file.type?.startsWith("image/") ?? file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        send.mutate({
          chatId,
          type:      isImage ? "image" : "file",
          fileUrl:   file.url,
          fileName:  file.name,
          replyToId,
        });
      }
      setUploading(false);
    },
    onUploadError: () => setUploading(false),
  });

  function handleSend() {
    if (!text.trim()) return;
    send.mutate({ chatId, content: text.trim(), type: "text", replyToId });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    void startUpload([file]);
    e.target.value = "";
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2">
        {/* File attach */}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="rounded-xl p-2.5 text-gray-400 hover:bg-gray-100 disabled:opacity-50" title="Attach file">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
          accept="image/*,application/pdf,.doc,.docx,.txt" />

        {/* Text input */}
        <div className="flex-1">
          <textarea
            className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-green-400 focus:bg-white focus:outline-none"
            placeholder={uploading ? "Uploading file..." : "Type a message..."}
            rows={1}
            value={text}
            onChange={e => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={uploading}
          />
        </div>

        {/* Send */}
        <button type="button" onClick={handleSend}
          disabled={!text.trim() || send.isPending || uploading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-500 text-white transition hover:bg-green-400 disabled:opacity-50">
          <svg className="h-5 w-5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
