import {integer, pgTable, text} from "drizzle-orm/pg-core";
import {nanoid} from "nanoid";
import {createInsertSchema} from "drizzle-zod";
import {applications} from "@dokploy/server/db/schema/application";
import {z} from "zod";

export const applicationShopInfo = pgTable("application_shop_info", {
    appShopId: integer("appShopId")
        .notNull()
        .primaryKey(),
    name: text("name"),
    description: text("description"),
    github: text("github"),
    website: text("website"),
    docs: text("docs"),
    tags: text("tags").array(),
    instruction: text("instruction"),
    logo: text("logo"),
    intime: text("intime"),
    updateTime: text("updateTime"),
    userId: text("userId"),
    installNum: text("installNum"),
    status: text("status"),
    versionNum: text("versionNum"),
});

export const appTags = pgTable("app_tags", {
    key: integer("key"),
    value: text("value"),
});

const createSchema = createInsertSchema(applicationShopInfo, {
    appShopId: z.bigint(),
    name: z.string(),
    description: z.string(),
    github: z.string(),
    website: z.string(),
    docs: z.string(),
    tags: z.array(z.string()),
    instruction: z.string(),
    logo: z.string(),
    intime: z.string(),
    updateTime: z.string(),
    status: z.string(),
    versionNum: z.string(),
})

export const apiCreateApplicationShop =
    createSchema
        .pick({
            name: true,
            description: true,
            github: true,
            website: true,
            docs: true,
            tags: true,
            instruction: true,
            logo: true,
        })
        .extend({
            applicationId: z.string(),
            versionNum: z.string(),
            addType: z.string(),
            appShopId: z.string(),
        })

export const apiQueryTags = z.object({
    order: z.string(),
});