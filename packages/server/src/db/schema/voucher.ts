import {boolean, pgTable, text, integer, numeric, timestamp} from "drizzle-orm/pg-core";
import {nanoid} from "nanoid";
import {organization} from "@dokploy/server/db/schema/account";

export const voucher = pgTable("voucher", {
    voucherId: text("vocherId")
        .notNull()
        .primaryKey()
        .$defaultFn(() => nanoid()),
    vName: text("vName").notNull(),
    amount: numeric("amount").notNull(),
    balance: numeric("balance").notNull(),
    exchangeId: text("exchangeId"),
    vType: text("vType"),
    validity: integer("validity"), // Admin ID who created the AI settings
    expiry: text("expiry"),
    userId: text("userId").notNull(),
    serverIds: text("serverIds").array(),
    standIds: text("standIds").array(),
    intime: text("intime")
        .notNull()
        .$defaultFn(() => new Date().toISOString()),
    status: text("status").notNull().default("0"),
});

export const coupon = pgTable("coupon", {
    id: text("couponId")
        .notNull()
        .primaryKey()
        .$defaultFn(() => nanoid()),
    name: text("name").notNull(),
    type: integer("type").notNull(),
    discountRate: numeric("discount_rate").notNull(),
    highest: numeric("highest"),
    threshold: numeric("threshold"),
    reduced: numeric("reduced"), // Admin ID who created the AI settings
    desc: text("desc"),
    status: text("status").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .$defaultFn(() => new Date()),
    expiredAt: timestamp("expired_at", { withTimezone: true })
        .notNull()
        .$defaultFn(() => new Date()),
    exchangeId: text("exchangeId"),
});
