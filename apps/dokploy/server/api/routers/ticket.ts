import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { createTicket, getTicketById, getTickets, updateTicket, deleteTicket, addComment } from '@dokploy/server';

export const ticketRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
        title: z.string().min(3, { message: "Title must be at least 3 characters" }),
        description: z
            .string()
            .min(10, { message: "Description must be at least 10 characters" }),
        type: z.string(),
        priority: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createTicket(input, ctx);
    }),

  one: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      return getTicketById(input.id);
    }),

  all: protectedProcedure
    .input(z.object({
      page: z.number().optional().default(1),
      limit: z.number().optional().default(10),
      search: z.string().optional().default(''),
      priority: z.array(z.string()).optional().default([]),
    }))
    .query(async ({ input, ctx }) => {
      return getTickets(input, ctx);
    }),

  update: protectedProcedure
    .input(z.object({
        ticketId: z.number(),
        status: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      return updateTicket(input.ticketId, input);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return deleteTicket(input.id);
    }),

  addComment: protectedProcedure
    .input(z.object({
      ticketId: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return addComment(input.ticketId, ctx.session.userId, input.content);
    }),
});