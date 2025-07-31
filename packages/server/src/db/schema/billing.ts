import {integer, numeric, pgTable, text, timestamp} from "drizzle-orm/pg-core";

export const billingStandDetail = pgTable("billing_stand_detail", {
    id: text("id")
        .notNull()
        .primaryKey(),
    applicationId: text("applicationId").notNull(),
    amount: numeric("amount").notNull(),
    standId: integer("standId").notNull(),
    num: integer("num").notNull(),
    serverId: text("serverId"),
    organizationId: text("organizationId"),
    createdAt: timestamp('createdAt', { withTimezone: true }).$defaultFn(()=>new Date()),
});

export const billing = pgTable("billing", {
    id: integer("id"),
    type: integer("type").notNull().default(0),
    amount: numeric("amount").notNull(),
    applicationId: text("applicationId").notNull(),
    userId: text("userId").notNull(),
    resourceId: text("resourceId"),
    organizationId: text("organizationId"),
    payType: integer("payType").notNull(),
    voucherId: text("voucherId"),
    createdAt: timestamp('createdAt', { withTimezone: true }).$defaultFn(()=>new Date()),
});