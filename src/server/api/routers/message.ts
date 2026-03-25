import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { message, chatMember, notification, user, messageRead } from "@/server/db/schema";
import { and, eq, desc, lt, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS:  true,
});

export const messageRouter = createTRPCRouter({

  // ── Fetch messages (paginated) ────────────────────────────

  list: protectedProcedure
    .input(z.object({
      chatId: z.string().uuid(),
      limit:  z.number().default(50),
      cursor: z.string().uuid().optional(), // last message id for pagination
    }))
    .query(async ({ ctx, input }) => {
      // Verify membership
      const membership = await ctx.db.query.chatMember.findFirst({
        where: and(eq(chatMember.chatId, input.chatId), eq(chatMember.userId, ctx.session.user.id)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      let cursorDate: Date | undefined;
      if (input.cursor) {
        const cursorMsg = await ctx.db.query.message.findFirst({
          where: eq(message.id, input.cursor),
          columns: { createdAt: true },
        });
        cursorDate = cursorMsg?.createdAt;
      }

      const messages = await ctx.db.query.message.findMany({
        where: and(
          eq(message.chatId, input.chatId),
          cursorDate ? lt(message.createdAt, cursorDate) : undefined,
        ),
        with: {
          sender: { columns: { id: true, name: true, image: true } },
          replyTo: {
            columns: { id: true, content: true, isDeleted: true },
            with: { sender: { columns: { id: true, name: true } } },
          },
          reads: { columns: { userId: true, readAt: true } },
        },
        orderBy: desc(message.createdAt),
        limit: input.limit,
      });

      return messages.reverse();
    }),

  // ── Send message ──────────────────────────────────────────

  send: protectedProcedure
    .input(z.object({
      chatId:    z.string().uuid(),
      content:   z.string().max(4000).optional(),
      type:      z.enum(["text","image","file","audio"]).default("text"),
      fileUrl:   z.string().optional(),
      fileName:  z.string().optional(),
      fileSize:  z.number().int().optional(),
      replyToId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify membership
      const membership = await ctx.db.query.chatMember.findFirst({
        where: and(eq(chatMember.chatId, input.chatId), eq(chatMember.userId, ctx.session.user.id)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      if (!input.content && !input.fileUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Message must have content or file" });
      }

      const sender = await ctx.db.query.user.findFirst({
        where: eq(user.id, ctx.session.user.id),
        columns: { id: true, name: true, image: true },
      });

      const [msg] = await ctx.db.insert(message).values({
        chatId:      input.chatId,
        senderId:    ctx.session.user.id,
        type:        input.type,
        content:     input.content,
        fileUrl:     input.fileUrl,
        fileName:    input.fileName,
        fileSize:    input.fileSize,
        replyToId:   input.replyToId,
        isEncrypted: true, // dummy flag
      }).returning();

      // Trigger Pusher event for real-time delivery
      const msgPayload = {
        ...msg,
        sender,
        reads: [],
        replyTo: null,
      };

      await pusher.trigger(`chat-${input.chatId}`, "new-message", msgPayload);

      // Notify all other members
      const members = await ctx.db.query.chatMember.findMany({
        where: and(eq(chatMember.chatId, input.chatId)),
        columns: { userId: true, isMuted: true },
      });

      const otherMembers = members.filter(m => m.userId !== ctx.session.user.id && !m.isMuted);
      if (otherMembers.length > 0) {
        await ctx.db.insert(notification).values(
          otherMembers.map(m => ({
            userId:    m.userId,
            chatId:    input.chatId,
            messageId: msg!.id,
            title:     `${sender?.name ?? "Someone"} sent a message`,
            body:      input.content?.slice(0, 100) ?? `Sent a ${input.type}`,
          }))
        );

        // Pusher event per user for notification badge
        await Promise.all(otherMembers.map(m =>
          pusher.trigger(`user-${m.userId}`, "new-notification", {
            chatId:  input.chatId,
            message: input.content?.slice(0, 50) ?? `Sent a ${input.type}`,
            from:    sender?.name,
          })
        ));
      }

      return msg;
    }),

  // ── Delete message ────────────────────────────────────────

  delete: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const msg = await ctx.db.query.message.findFirst({
        where: eq(message.id, input.messageId),
      });
      if (!msg) throw new TRPCError({ code: "NOT_FOUND" });
      if (msg.senderId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db.update(message)
        .set({ isDeleted: true, content: null, fileUrl: null, updatedAt: new Date() })
        .where(eq(message.id, input.messageId));

      await pusher.trigger(`chat-${msg.chatId}`, "message-deleted", { messageId: input.messageId });

      return { success: true };
    }),

  // ── Mark message as read ──────────────────────────────────

  markRead: protectedProcedure
    .input(z.object({ messageId: z.string().uuid(), chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Upsert read receipt
      const existing = await ctx.db.query.messageRead.findFirst({
        where: and(
          eq(messageRead.messageId, input.messageId),
          eq(messageRead.userId,    ctx.session.user.id),
        ),
      });

      if (!existing) {
        await ctx.db.insert(messageRead).values({
          messageId: input.messageId,
          userId:    ctx.session.user.id,
        });

        // Notify sender of read receipt
        await pusher.trigger(`chat-${input.chatId}`, "message-read", {
          messageId: input.messageId,
          userId:    ctx.session.user.id,
          readAt:    new Date().toISOString(),
        });
      }
    }),
});

