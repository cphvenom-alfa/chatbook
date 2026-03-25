import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { chat, chatMember, message, user, notification, messageRead } from "@/server/db/schema";
import { and, eq, desc, ne, asc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import Pusher from "pusher";

// Pusher server instance
const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS:  true,
});

export const chatRouter = createTRPCRouter({

  // ── My chats list ─────────────────────────────────────────

  myChats: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.query.chatMember.findMany({
      where: and(
        eq(chatMember.userId, ctx.session.user.id),
        eq(chatMember.isArchived, false),
      ),
      with: {
        chat: {
          with: {
            members: {
              with: { user: { columns: { id: true, name: true, image: true, isOnline: true, lastSeen: true } } },
            },
            messages: {
              orderBy: desc(message.createdAt),
              limit: 1,
              with: { sender: { columns: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: desc(chatMember.joinedAt),
    });

    // Attach unread count
    return Promise.all(memberships.map(async m => {
      const unreadCount = await ctx.db.query.message.findMany({
        where: and(
          eq(message.chatId, m.chatId),
          ne(message.senderId, ctx.session.user.id),
          eq(message.isDeleted, false),
        ),
        columns: { id: true, createdAt: true },
      }).then(msgs =>
        msgs.filter(msg =>
          !m.lastRead || new Date(msg.createdAt) > new Date(m.lastRead)
        ).length
      );

      return { ...m, unreadCount };
    }));
  }),

  // ── Get or create direct chat ────────────────────────────

  getOrCreateDirect: protectedProcedure
    .input(z.object({ targetUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.targetUserId === ctx.session.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot chat with yourself" });
      }

      // Find existing direct chat between the two users
      const myChats = await ctx.db.query.chatMember.findMany({
        where: and(
          eq(chatMember.userId, ctx.session.user.id),
        ),
        columns: { chatId: true },
      });
      const myChatIds = myChats.map(m => m.chatId);

      if (myChatIds.length > 0) {
        const theirMembership = await ctx.db.query.chatMember.findFirst({
          where: and(
            eq(chatMember.userId, input.targetUserId),
            inArray(chatMember.chatId, myChatIds),
          ),
          with: { chat: true },
        });

        if (theirMembership?.chat.type === "direct") {
          return theirMembership.chat;
        }
      }

      // Create new direct chat
      const [newChat] = await ctx.db.insert(chat).values({
        type:      "direct",
        createdBy: ctx.session.user.id,
      }).returning();

      await ctx.db.insert(chatMember).values([
        { chatId: newChat!.id, userId: ctx.session.user.id,      role: "member" },
        { chatId: newChat!.id, userId: input.targetUserId,       role: "member" },
      ]);

      return newChat;
    }),

  // ── Create group chat ────────────────────────────────────

  createGroup: protectedProcedure
    .input(z.object({
      name:        z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      avatar:      z.string().optional(),
      memberIds:   z.array(z.string()).min(1).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const [newChat] = await ctx.db.insert(chat).values({
        type:        "group",
        name:        input.name,
        description: input.description,
        avatar:      input.avatar,
        createdBy:   ctx.session.user.id,
      }).returning();

      const allMemberIds = [ctx.session.user.id, ...input.memberIds.filter(id => id !== ctx.session.user.id)];
      await ctx.db.insert(chatMember).values(
        allMemberIds.map(uid => ({
          chatId: newChat!.id,
          userId: uid,
          role:   uid === ctx.session.user.id ? "owner" as const : "member" as const,
        }))
      );

      return newChat;
    }),

  // ── Chat detail (members + recent messages) ───────────────

  detail: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify membership
      const membership = await ctx.db.query.chatMember.findFirst({
        where: and(eq(chatMember.chatId, input.chatId), eq(chatMember.userId, ctx.session.user.id)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      const chatData = await ctx.db.query.chat.findFirst({
        where: eq(chat.id, input.chatId),
        with: {
          members: {
            with: { user: { columns: { id: true, name: true, image: true, isOnline: true, lastSeen: true, status: true } } },
          },
        },
      });
      if (!chatData) throw new TRPCError({ code: "NOT_FOUND" });

      return { ...chatData, myRole: membership.role, isMuted: membership.isMuted };
    }),

  // ── Update last read (mark as read) ──────────────────────

  markRead: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(chatMember)
        .set({ lastRead: new Date() })
        .where(and(
          eq(chatMember.chatId, input.chatId),
          eq(chatMember.userId, ctx.session.user.id),
        ));
    }),

  // ── Group management ──────────────────────────────────────

  addMembers: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), userIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const me = await ctx.db.query.chatMember.findFirst({
        where: and(eq(chatMember.chatId, input.chatId), eq(chatMember.userId, ctx.session.user.id)),
      });
      if (!me || (me.role !== "admin" && me.role !== "owner")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can add members" });
      }

      await ctx.db.insert(chatMember).values(
        input.userIds.map(uid => ({ chatId: input.chatId, userId: uid, role: "member" as const }))
      );
    }),

  removeMember: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = await ctx.db.query.chatMember.findFirst({
        where: and(eq(chatMember.chatId, input.chatId), eq(chatMember.userId, ctx.session.user.id)),
      });
      // Can remove self (leave) or admin can remove others
      if (input.userId !== ctx.session.user.id && (!me || (me.role !== "admin" && me.role !== "owner"))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db.delete(chatMember).where(and(
        eq(chatMember.chatId, input.chatId),
        eq(chatMember.userId, input.userId),
      ));
    }),

  promoteAdmin: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = await ctx.db.query.chatMember.findFirst({
        where: and(eq(chatMember.chatId, input.chatId), eq(chatMember.userId, ctx.session.user.id)),
      });
      if (!me || me.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Only owner can promote" });

      await ctx.db.update(chatMember)
        .set({ role: "admin" })
        .where(and(eq(chatMember.chatId, input.chatId), eq(chatMember.userId, input.userId)));
    }),

  updateGroup: protectedProcedure
    .input(z.object({
      chatId:      z.string().uuid(),
      name:        z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      avatar:      z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await ctx.db.query.chatMember.findFirst({
        where: and(eq(chatMember.chatId, input.chatId), eq(chatMember.userId, ctx.session.user.id)),
      });
      if (!me || (me.role !== "admin" && me.role !== "owner")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { chatId, ...data } = input;
      await ctx.db.update(chat).set({ ...data, updatedAt: new Date() }).where(eq(chat.id, chatId));
    }),

  muteChat: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), mute: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(chatMember)
        .set({ isMuted: input.mute })
        .where(and(eq(chatMember.chatId, input.chatId), eq(chatMember.userId, ctx.session.user.id)));
    }),
});

