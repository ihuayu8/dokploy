import {TRPCError} from "@trpc/server";
import {
    type apiCreateApplication, applications, billing, billingStandDetail, voucher, server, stand, users_temp,
} from "@dokploy/server/db/schema";
import {Application, findApplicationById, updateApplicationStatus} from "@dokploy/server/services/application";
import {db} from "@dokploy/server/db";
import {and, asc, desc, eq, gt, gte, inArray, ne, sql, lt} from "drizzle-orm";
import {stopService, stopServiceRemote} from "@dokploy/server/utils/docker/utils";

interface ContainerSize {
    stand: string,
    memoryReservation: string,
    memoryLimit: string,
    cpuReservation: string,
    cpuLimit: string,
}

interface ResourceConfig {
    [key: string]: {
        cpu: string;
        mem: string;
    };
}

export const allocateCluster = async () => {
    // 获取默认主机列表
    let defaultList = await db.query.server.findMany({
        where: and(
            eq(server.isDefault, true),
            eq(server.allowCreate, true)
        ),
    })

    // 如果没有可用的默认主机
    if (defaultList.length === 0) {
        defaultList = await db.query.server.findMany({
            where: and(
                eq(server.allowCreate, true)
            ),
        })
    }

    // 如果还为空
    if (defaultList.length === 0) {
        return null;
    }

    if (defaultList.length === 1) {
        return defaultList[0]?.serverId;
    }

    const randomInt = Math.floor(Math.random() * defaultList.length);
    return defaultList[randomInt]?.serverId;
}

// 根据规格计算cpu和内存限制
export const setRealStand = async (input: typeof apiCreateApplication._type | Partial<Application>) => {
    let stdList: any = [];
    const serverInfo = await db.query.server.findFirst({
        where: eq(server.serverId, input.serverId || ""),
    });

    if (!!serverInfo && !!serverInfo.standList && serverInfo.standList.length > 0) {
        stdList = await db.query.stand.findMany({
            orderBy: asc(stand.num),
            where: inArray(stand.id, serverInfo.standList),
        });
    } else {
        stdList = await db.query.stand.findMany({
            orderBy: asc(stand.num),
        });
    }
    // @ts-ignore
    const standard = stdList.find(item => item.id === input.stand)
    if (!standard) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: "无该实例规格！"
        })
    }
    try {
        const size: ContainerSize = {
            memoryReservation: standard.memlimit,
            memoryLimit: standard.memlimit,
            cpuReservation: standard.cpulimit,
            cpuLimit: standard.cpulimit,
            stand: input.stand || ""
        }
        return size
    } catch (error) {
        console.error(error)

        throw new TRPCError({
            code: 'FORBIDDEN',
            message: "无该实例规格！"
        })
    }

}

export function getRandomPort() {
    // 计算范围大小：49000 - 10000 + 1 = 39001
    const range = 39001;
    // 生成 0 到 range-1 之间的随机整数，再加上最小值 10000
    return Math.floor(Math.random() * range) + 10000;
}


// 计费查询服务
export async function billingProcess() {
    // 获取所有服务
    const appList = await db.query.applications.findMany({
        where: ne(applications.currentReplicas, 0),
        with: {
            project: true
        }
    })
    console.log(`[${new Date()} - 服务计费查询]计费查询服务开始，本次需要计费应用数量为${appList.length}`)

    // 获取所有服务器
    const serverList = await db.query.server.findMany();

    // 获取所有规格
    const standList = await db.query.stand.findMany();

    // 插入计费表
    const billingList: any = []
    appList.forEach(item => {
        // 计算本小时费用
        const server = serverList.find(server => item.serverId === server.serverId)
        if (!server) {
            console.error(`[${new Date()} - 服务计费查询]计费失败，服务器信息不存在，applicationId=${item.applicationId}, 
            serverId=${item.serverId}`)
            return;
        }
        const stand = standList.find(stand => stand.id === item.currentStand)
        if (!stand) {
            console.error(`[${new Date()} - 服务计费查询]计费失败，实例规格信息不存在，applicationId=${item.applicationId}, 
            standId=${item.stand}`)
            return;
        }
        // @ts-ignore
        const amount = stand?.price * item?.currentReplicas * server?.rate
        const {project} = item

        billingList.push({
            applicationId: item.applicationId,
            amount: amount,
            standId: item.stand,
            num: item.currentReplicas,
            serverId: item.serverId,
            // @ts-ignore
            organizationId: project.organizationId,
        })
    })

    // 实际插入
    await db.insert(billingStandDetail).values(billingList).returning()
    console.log(`[${new Date()} - 服务计费查询]计费查询服务结束`)
}

// 计费查询服务
export async function charging() {
    // 查询所有组织
    const orgList = await db.query.organization.findMany()

    for (const org of orgList) {
        /** 计算资源计费 **/

        // 获取当前时间
        const now = new Date();

        // 计算上个小时的结束时间（当前小时的0分0秒）
        const endOfLastHour = new Date(now);
        endOfLastHour.setMinutes(0, 0, 0); // 重置为当前小时的起点（如14:00:00）

        // 计算上个小时的开始时间（结束时间减去1小时）
        const startOfLastHour = new Date(endOfLastHour);
        startOfLastHour.setHours(endOfLastHour.getHours() - 1);

        console.log(`[${new Date()} - 扣费并生成账单]服务开始，本次计费时间段为：${startOfLastHour} - ${endOfLastHour}`)

        // 获取一小时内的计费账单详情
        const computeList = await db.query.billingStandDetail.findMany({
                where: and(
                    eq(billingStandDetail.organizationId, org.id),
                    gte(billingStandDetail.createdAt, startOfLastHour), // 大于等于上个小时起点
                    lt(billingStandDetail.createdAt, endOfLastHour)     // 小于当前小时起点
                )
        })
        console.log(`[${new Date()} - 扣费并生成账单]获取到计费项条数为：${computeList.length}`)
        // 按服务分组
        const appGroupMap: any = {} // 计算资源价格分组
        computeList.forEach(compute => {
            if (!!appGroupMap[compute.applicationId]) {
                // 如果资源价格已存在则比较价格
                if (compute.amount > appGroupMap[compute.applicationId].amount) {
                    appGroupMap[compute.applicationId] = compute
                }
            } else {
                // 资源不存在则添加
                appGroupMap[compute.applicationId] = compute
            }
        })
        // 按应用实际价格扣费
        for (const key in appGroupMap) {
            const detail = appGroupMap[key]

            // 判断应用是否在该时间段已经计费
            const nextHour = new Date(endOfLastHour)
            nextHour.setHours(endOfLastHour.getHours() + 1)
            const billingInfo = await db.query.billing.findFirst({
                where: and(
                    eq(billing.applicationId, key),
                    gte(billing.createdAt, endOfLastHour), // 大于等于当前时间的0分0秒
                    lt(billing.createdAt, nextHour)     // 小于下个小时
                )
            })
            if(!!billingInfo){
                console.warn(`[${new Date()} - 扣费并生成账单]当前应用 ${key} 本时段已经计费，不再重复计费！`)
                continue
            }

            // 判断本计费项是否可以使用代金券支付
            const vouchers = await db.query.voucher.findMany({
                where: and(
                    eq(voucher.status, "0"),
                    eq(voucher.userId, org.ownerId),
                    gte(voucher.balance, detail.amount)
                ),
                orderBy: desc(voucher.intime)
            })

            let voucherId = "";

            // 是否有专用代金券
            for(const vc of vouchers) {
                if (vc.standIds && vc.standIds.includes(detail.standId)
                    && (!vc.serverIds || vc.serverIds.includes(detail.serverId))) {
                    voucherId = vc.voucherId
                }

                if (vc.serverIds && vc.serverIds.includes(detail.serverId)
                    && (!vc.standIds || vc.standIds.includes(detail.standId))) {
                    voucherId = vc.voucherId
                }
                if (!vc.standIds && !vc.serverIds && voucherId === "") {
                    voucherId = vc.voucherId
                }
            }

            if (voucherId != "") {
                // 代金券计费
                await db.update(voucher).set({
                    balance: sql`${voucher.balance}
                    -
                    ${detail.amount}`
                }).where(eq(voucher.voucherId, voucherId)).returning()
            } else {
                // 余额计费
                const user = await db.update(users_temp).set({
                    balance: sql`${users_temp.balance}
                    -
                    ${detail.amount}`
                }).where(eq(users_temp.id, org.ownerId)).returning().then((res:any) => res[0]);
                if (user.balance <= 0) {
                    // 用户余额已经不足立即停止该应用
                    const service = await findApplicationById(detail.applicationId);
                    await stopServiceRemote(service.serverId, service.appName, service);
                    await updateApplicationStatus(detail.applicationId, "idle");
                }
            }
            console.log(`[${new Date()} - 扣费并生成账单]当前应用 ${key} 【计算资源】计费完成，扣费渠道为${voucherId === "" ? '账户余额' : '代金券'}, 计费金额为${detail.amount}`)
            // 插入实际计费表
            await db.insert(billing).values({
                type: 0,
                amount: detail.amount,
                applicationId: detail.applicationId,
                userId: org.ownerId,
                organizationId: org.id,
                payType: voucherId === "" ? 0 : 1,
                voucherId: voucherId,
            }).returning()
        }

        console.log(`[${new Date()} - 扣费并生成账单]流程结束，全部计费完成！`)

    }
}