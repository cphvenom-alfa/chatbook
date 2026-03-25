"use client";
import { useEffect } from "react";
import { api } from "@/trpc/react";

export function OnlineTracker() {
  const setOnline = api.profile.setOnline.useMutation();

  useEffect(() => {
    setOnline.mutate({ isOnline: true });

    function handleOffline() { setOnline.mutate({ isOnline: false }); }
    window.addEventListener("beforeunload", handleOffline);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) handleOffline();
      else setOnline.mutate({ isOnline: true });
    });

    return () => {
      window.removeEventListener("beforeunload", handleOffline);
      setOnline.mutate({ isOnline: false });
    };
  }, [setOnline.mutate]);

  return null;
}