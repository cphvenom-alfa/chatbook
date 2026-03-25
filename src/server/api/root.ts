import { postRouter } from "@/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { chatRouter }         from "./routers/chat";
import { messageRouter }      from "./routers/message";
import { profileRouter }      from "./routers/profile";
import { notificationRouter } from "./routers/notification";

export const appRouter = createTRPCRouter({
  chat:         chatRouter,
  message:      messageRouter,
  profile:      profileRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
