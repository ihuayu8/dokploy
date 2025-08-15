import type { NextApiRequest, NextApiResponse } from 'next';
import {rechargeOrder, users_temp} from "@dokploy/server/db/schema";
import {eq, sql} from "drizzle-orm";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === 'POST') {
        const { token } = req.query;
        const { amount,third_order_id,endTime,payType,customerId } = req.body;
        console.log("req",req.body);
        // 验证token
        if (token != 'huayu5355408') {
            res.status(400).json({
                success: false,
                message: 'Token验证失败'
            });
            return;
        }

        // 处理支付逻辑

        // 验证订单
        if (!third_order_id) {
            res.status(400).json({
                success: false,
                message: '订单ID不能为空'
            });
            return;
        }
        // 查询原订单信息
        const order = await db.query.rechargeOrder.findFirst({
            where: eq(rechargeOrder.id, third_order_id),
        });
        if (!order) {
            res.status(400).json({
                success: false,
                message: '订单不存在'
            });
            return;
        }

        // 验证订单状态
        if (order.status != '0') {
            res.status(400).json({
                success: false,
                message: '订单已支付'
            });
            return;
        }

        // 用户增加余额
        await db.update(users_temp)
            .set({
                balance: sql`${users_temp.balance} + ${order.amount}`,
            })
            .where(eq(users_temp.id, order.userId));

        // 更新订单状态
        await db.update(rechargeOrder)
            .set({
                status: '1',
                endTime: endTime,
                payType: payType,
                customerId: customerId,
            })
            .where(eq(rechargeOrder.id, order.id));

        console.log(`[用户充值]充值成功！用户ID[${order.userId}], 充值金额[${order.amount}],实际支付金额[${order.payAmount}]`)

        res.status(200).json({
            success: true,
            payAmount: amount,
            message: 'Payment processed successfully'
        });
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}