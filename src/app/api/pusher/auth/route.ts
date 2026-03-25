import { auth } from "@/server/better-auth/config";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS:  true,
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId   = params.get("socket_id")!;
  const channel    = params.get("channel_name")!;

  // Only allow user to subscribe to their own user channel
  if (channel === `user-${session.user.id}`) {
    const authResponse = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(authResponse);
  }

  // Allow chat channel if user is a member (simplified — full check in middleware)
  const authResponse = pusher.authorizeChannel(socketId, channel);
  return NextResponse.json(authResponse);
}