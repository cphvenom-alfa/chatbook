import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { user } from "@/server/db/schema";
import { eq, ilike, ne, and } from "drizzle-orm";

export const profileRouter = createTRPCRouter({

  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.user.findFirst({ where: eq(user.id, ctx.session.user.id) });
  }),

  update: protectedProcedure
    .input(z.object({
      name:   z.string().min(1).max(100).optional(),
      image:  z.string().optional(),
      status: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(user)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(user.id, ctx.session.user.id));
    }),

  setOnline: protectedProcedure
    .input(z.object({ isOnline: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(user)
        .set({
          isOnline: input.isOnline,
          lastSeen: input.isOnline ? undefined : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id));
    }),

  // Search users to start a chat
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.user.findMany({
        where: and(
          ilike(user.name, `%${input.query}%`),
          ne(user.id, ctx.session.user.id),
        ),
        columns: { id: true, name: true, image: true, status: true, isOnline: true },
        limit: 20,
      });
    }),

  byId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.user.findFirst({
        where: eq(user.id, input.userId),
        columns: { id: true, name: true, image: true, status: true, isOnline: true, lastSeen: true },
      });
    }),
});

