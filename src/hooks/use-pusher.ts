"use client";
import { useEffect, useRef } from "react";
import PusherClient from "pusher-js";

let pusherClient: PusherClient | null = null;

function getPusherClient() {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster:          process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint:     "/api/pusher/auth",
      authTransport:    "ajax",
    });
  }
  return pusherClient;
}

export function usePusher(channelName: string, handlers: Record<string, (data: any) => void>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const client  = getPusherClient();
    const channel = client.subscribe(channelName);

    Object.keys(handlers).forEach(event => {
      channel.bind(event, (data: any) => {
        handlersRef.current[event]?.(data);
      });
    });

    return () => {
      // biome-ignore lint/suspicious/useIterableCallbackReturn: <explanation>
      Object.keys(handlers).forEach(event => channel.unbind(event));
      client.unsubscribe(channelName);
    };
  }, [channelName]);
}

// User-level channel for personal notifications
export function useUserPusher(userId: string, handlers: Record<string, (data: any) => void>) {
  usePusher(`user-${userId}`, handlers);
}
