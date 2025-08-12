import { relations } from "drizzle-orm";
import {boolean, integer, pgEnum, pgTable, text, timestamp} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { nanoid } from "nanoid";
import { z } from "zod";
import { users_temp } from "./user";

// 工单状态枚举
export const ticketStatus = pgEnum("ticketStatus", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

// 工单优先级枚举
export const ticketPriority = pgEnum("ticketPriority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

// 工单体表
export const tickets = pgTable("ticket", {
  ticketId: integer("ticketId")
    .primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  ticketType: text("ticketType"),
  status: ticketStatus("status").notNull().default("open"),
  priority: ticketPriority("priority").notNull().default("medium"),
  userId: text("userId")
    .notNull()
    .references(() => users_temp.id, { onDelete: "cascade" }),
  assignedTo: text("assignedTo").references(() => users_temp.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  isDeleted: boolean("isDeleted").notNull().default(false),
});

// 工单评论表
export const ticketComments = pgTable("ticket_comment", {
  commentId: text("commentId")
    .notNull()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  ticketId: integer("ticketId")
    .notNull()
    .references(() => tickets.ticketId, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users_temp.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  isDeleted: boolean("isDeleted").notNull().default(false),
});

// 定义关系
export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  user: one(users_temp, { fields: [tickets.userId], references: [users_temp.id] }),
  assignee: one(users_temp, { fields: [tickets.assignedTo], references: [users_temp.id] }),
  comments: many(ticketComments),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketComments.ticketId], references: [tickets.ticketId] }),
  user: one(users_temp, { fields: [ticketComments.userId], references: [users_temp.id] }),
}));

// 创建插入和更新模式
export const createTicketSchema = createInsertSchema(tickets).omit({
  ticketId: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  closedAt: true,
  status: true,
  isDeleted: true,
}).extend({
  type: z.string(),
});

export const updateTicketSchema = createTicketSchema.extend({
  ticketId: z.string().min(1),
  status: z.string().optional(),
});

export const createTicketCommentSchema = createInsertSchema(ticketComments).omit({
  commentId: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

// 导出API类型
export type ApiCreateTicket = z.infer<typeof createTicketSchema>;
export type ApiUpdateTicket = z.infer<typeof updateTicketSchema>;