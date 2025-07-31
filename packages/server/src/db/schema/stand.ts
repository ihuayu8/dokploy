import {integer, numeric, pgTable, text} from "drizzle-orm/pg-core";

export const stand = pgTable("stand", {
    id: text("id")
        .notNull()
        .primaryKey(),
    name: text("name"),
    cpulimit: text("cpulimit"),
    cpulabel: text("cpulabel"),
    memlimit: text("memlimit"),
    memlabel: text("memlabel"),
    price: numeric("price"),
    num: integer("num"),
    resource: integer("resource"),
});