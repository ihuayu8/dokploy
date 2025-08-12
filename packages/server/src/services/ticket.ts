import { db } from "@dokploy/server/db";
import { ApiCreateTicket, ApiUpdateTicket, tickets, ticketComments } from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, desc } from "drizzle-orm";
import { findUserById } from "./admin";

export type Ticket = typeof tickets.$inferSelect;
export type TicketComment = typeof ticketComments.$inferSelect;

/**
 * 创建新工单
 */
export const createTicket = async (input: ApiCreateTicket, ctx : any) => {
  try {
    // 创建工单
    const newTicket = await db
      .insert(tickets)
        // @ts-ignore
      .values({
        ...input,
        // @ts-ignore
        status: "open",
        priority: input.priority || "medium",
        ticketType: input.type || "bug",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: ctx.session.userId,
      })
      .returning()
      .then((value) => value[0]);

    if (!newTicket) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Error creating the ticket",
      });
    }

    return newTicket;
  } catch (error) {
    console.log(error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Error creating the ticket",
      cause: error,
    });
  }
};

/**
 * 根据ID获取工单
 */
export const getTicketById = async (ticketId: string) => {
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.ticketId, Number(ticketId)),
    with: {
      comments: {
        orderBy: desc(ticketComments.createdAt),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
            }
          },
        }
      },
      user: {
        columns: {
          id: true,
          name: true,
        }
      },
    },
  });
  if (!ticket) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Ticket not found",
    });
  }

  return ticket;
};

/**
 * 获取工单列表
 */
export const getTickets = async (filters: {
}, ctx:any) => {
  const whereClause = [];

  const user = await findUserById(ctx.session.userId);
  if (user?.role !== 'admin') {
    whereClause.push(eq(tickets.userId, ctx.session.userId));
  }

  return await db.query.tickets.findMany({
    where: whereClause.length > 0 ? and(...whereClause) : undefined,
    orderBy: desc(tickets.createdAt),
  });
};

/**
 * 更新工单
 */
export const updateTicket = async (
  ticketId: number,
  input: ApiUpdateTicket
) => {
  try {
    const updatedTicket = await db
      .update(tickets)
      .set({
        // @ts-ignore
        status: input.status || "closed",
        updatedAt: new Date(),
      })
       // @ts-ignore
      .where(eq(tickets.ticketId, ticketId))
      .returning()
      .then((value) => value[0]);

    if (!updatedTicket) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Ticket not found",
      });
    }

    return updatedTicket;
  } catch (error) {
    console.error(error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Error updating the ticket",
      cause: error,
    });
  }
};

/**
 * 删除工单
 */
export const deleteTicket = async (ticketId: number) => {
  try {
    // 先删除相关评论
    // @ts-ignore
    await db.delete(ticketComments).where(eq(ticketComments.ticketId, ticketId));

    // 再删除工单
    const deletedTicket = await db
      .delete(tickets)
      // @ts-ignore
      .where(eq(tickets.ticketId, ticketId))
      .returning()
      .then((value) => value[0]);

    if (!deletedTicket) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Ticket not found",
      });
    }

    return deletedTicket;
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Error deleting the ticket",
      cause: error,
    });
  }
};

/**
 * 添加评论
 */
export const addComment = async (
  ticketId: string,
  userId: string,
  content: string
) => {
  try {
    // 验证工单是否存在
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Ticket not found",
      });
    }

    if(ticket.status === "closed"){
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "工单已关闭！",
      });
    }

    // 验证用户是否存在
    const user = await findUserById(userId);
    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // 创建评论
    const newComment = await db
      .insert(ticketComments)
        // @ts-ignore
      .values({
        ticketId: Number(ticketId),
        userId,
        content,
      })
      .returning()
      .then((value) => value[0]);


    if (!newComment) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Error creating the comment",
      });
    }

    if(user.role === 'admin' && ticket.status === 'open'){
      // 更新工单状态
      await db.update(tickets).set({
        status: 'in_progress',
      }).where(eq(tickets.ticketId, Number(ticketId)));
    }

    return newComment;
  } catch (error) {
    console.error(error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Error creating the comment",
      cause: error,
    });
  }
};

/**
 * 获取工单评论
 */
export const getTicketComments = async (ticketId: string) => {
  return await db.query.ticketComments.findMany({
    where: eq(ticketComments.ticketId, Number(ticketId)),
    orderBy: desc(ticketComments.createdAt),
  });
};

/**
 * 删除评论
 */
export const deleteComment = async (commentId: string) => {
  try {
    const deletedComment = await db
      .delete(ticketComments)
      .where(eq(ticketComments.commentId, commentId))
      .returning()
      .then((value) => value[0]);

    if (!deletedComment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Comment not found",
      });
    }

    return deletedComment;
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Error deleting the comment",
      cause: error,
    });
  }
};

/**
 * 更新评论
 */
export const updateComment = async (
  commentId: string,
  content: string
) => {
  try {
    const updatedComment = await db
      .update(ticketComments)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(ticketComments.commentId, commentId))
      .returning()
      .then((value) => value[0]);

    if (!updatedComment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Comment not found",
      });
    }

    return updatedComment;
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Error updating the comment",
      cause: error,
    });
  }
};