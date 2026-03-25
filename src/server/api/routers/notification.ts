import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { notification } from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const notificationRouter = createTRPCRouter({

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.notification.findMany({
      where: eq(notification.userId, ctx.session.user.id),
      with: { chat: { columns: { id: true, name: true, type: true } } },
      orderBy: desc(notification.createdAt),
      limit: 50,
    });
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(notification).set({ isRead: true }).where(eq(notification.id, input.id));
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.update(notification)
      .set({ isRead: true })
      .where(eq(notification.userId, ctx.session.user.id));
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const unread = await ctx.db.query.notification.findMany({
      where: and(eq(notification.userId, ctx.session.user.id), eq(notification.isRead, false)),
      columns: { id: true },
    });
    return unread.length;
  }),
});

