import {boolean, pgTable, text, integer, numeric} from "drizzle-orm/pg-core";
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