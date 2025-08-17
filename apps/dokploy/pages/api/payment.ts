import type { NextApiRequest, NextApiResponse } from 'next';
import {coupon, rechargeOrder, users_temp, voucher} from "@/server/db/schema";
import {and, eq, or, sql} from "drizzle-orm";
import { db } from "@/server/db";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === 'POST') {
        const { token } = req.query;
        const { amount,third_order_id,endTime,payType,customerId } = req.body;
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

        // 更新优惠券状态
        if(order.couponId && order.couponId != ""){
            await db.update(coupon)
                .set({
                    status: '1',
                })
                .where(eq(coupon.id, order.couponId));
        }

        // 用户增加余额
        await db.update(users_temp)
            .set({
                balance: sql`${users_temp.balance} + ${order.amount}`,
            })
            .where(eq(users_temp.id, order.userId));


        console.log(`[用户充值]充值成功！用户ID[${order.userId}], 充值金额[${order.amount}],实际支付金额[${order.payAmount}]`)

        // 查询该顾客是否支付过
        const customer = await db.query.rechargeOrder.findFirst({
            where: or(
                eq(rechargeOrder.customerId, customerId),
                and(
                    eq(rechargeOrder.userId, order.userId),
                    eq(rechargeOrder.status, '1')
                ),
            ),
        });
        if(!customer?.id){
            await db.update(users_temp)
                .set({
                    firstRecharge: true,
                })
                .where(eq(users_temp.id, order.userId));
            // 赠送优惠券和代金券
            await db.insert(coupon).values({
                name: "新用户首充5折优惠券",
                type: "1",
                discountRate: 0.5,
                highest: 10,
                threshold: 1,
                desc: "新用户专享首充5折优惠券，最高优惠10元",
                expiredAt: new Date(Date.now() + 2 * 30 * 24 * 60 * 60 * 1000),
                userId: order.userId,
            })
            await db.insert(voucher).values({
                vName: "新用户首充代金券",
                amount: 5,
                balance: 5,
                expiry: new Date(Date.now() + 2 * 30 * 24 * 60 * 60 * 1000),
                userId: order.userId,
            })
        }

        // 更新订单状态
        await db.update(rechargeOrder)
            .set({
                status: '1',
                endTime: endTime,
                payType: payType,
                customerId: customerId,
            })
            .where(eq(rechargeOrder.id, order.id));

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