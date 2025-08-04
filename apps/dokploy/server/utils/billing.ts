import { db } from "@/server/db";
import {and, eq} from "drizzle-orm";
import {member} from "@dokploy/server/db/schema";

// 检查余额是否允许足够部署到该节点
export const checkBalance = async (organId : string) => {
    // 获取组织的拥有者的信息
    const {userId, user} = await db.query.member.findFirst({
        where: and(
            eq(member.organizationId, organId),
            eq(member.role, "owner")
        ),
        columns: {
            userId: true
        },
        with: {
            user: {
                columns: {
                    balance: true,
                },
            },
        },
    });

    // TODO 检查代金券余额是否充足

    // 检查账户余额是否足够
    return user.balance >= 0;
}

