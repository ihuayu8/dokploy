import {integer, numeric, pgTable, text, timestamp, uniqueIndex} from "drizzle-orm/pg-core";

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

export const billingNetworkDetail = pgTable("billing_network_detail", {
    id: text("id"),
    applicationId: text("applicationId").notNull(),
    containerId: text("containerId"),
    lastUsed: integer("lastUsed"),
    currentUsed: integer("currentUsed"),
    serverId: text("serverId"),
    status: integer("status").notNull().default(0),
    updateAt: timestamp('updateAt', { withTimezone: true }).$defaultFn(()=>new Date()),
});

export const networkCount = pgTable("network_count", {
    id: integer("id"),
    userId: text("userId"),
    organizationId: text("organizationId"),
    currentUsed: integer("currentUsed").notNull().default(0),
    lastUsed: integer("lastUsed").notNull().default(0),
    all: integer("all").notNull().default(0),
    serverId: text("serverId"),
    yearmonth: text("yearmonth"),
},
    (t)=> [
        uniqueIndex("network_count_pk").on(t.yearmonth,t.organizationId, t.serverId)
    ]
);

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