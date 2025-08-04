import {TRPCError} from "@trpc/server";
import {
    type apiCreateApplication, applications, billing, billingStandDetail, voucher, server, stand, users_temp,
    billingNetworkDetail, networkCount, projects, mounts, organization
} from "@dokploy/server/db/schema";
import {Application, findApplicationById, updateApplicationStatus} from "@dokploy/server/services/application";
import {db} from "@dokploy/server/db";
import {and, asc, desc, eq, gt, gte, inArray, ne, sql, lt} from "drizzle-orm";
import {stopService, stopServiceRemote} from "@dokploy/server/utils/docker/utils";
import {getServiceContainersByAppName} from "@dokploy/server/services/docker";
import {getContainerState, parseHostsToMap, parseVolumeLines} from "@dokploy/server/monitoring/service";
import {integer, text} from "drizzle-orm/pg-core";
import {execAsyncRemoteOverServer} from "@dokploy/server/utils/process/execAsync";

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
    const serverList = await db.query.server.findMany({
        with: {
            sshKey: true
        }
    });

    // 获取所有规格
    const standList = await db.query.stand.findMany();

    // 插入计费表
    const billingList: any = []
    for (const item of appList) {
        /** 计算资源计费 **/
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

        /** 流量计费计费 **/
        getServiceContainersByAppName(item.appName, server.serverId).then(containers => {
            if (containers && containers.length > 0) {
                for (const container of containers) {
                    if (container.state !== 'running') {
                        continue;
                    }
                    getContainerState(container.containerId, container.name, item.serverId || "", container.node, item.appName).then(async (res) => {
                        const network = res?.network
                        if (network && network.length > 0) {
                            const inMb = parseInt(network[network.length - 1].value.inputMb.replaceAll("MB").trim())
                            const outMb = parseInt(network[network.length - 1].value.outputMb.replaceAll("MB").trim())
                            // 开启事务
                            await db.transaction(async (tx) => {
                                // 查询是否有该容器
                                const billingnw = await tx.query.billingNetworkDetail.findFirst({
                                    where: and(
                                        eq(billingNetworkDetail.applicationId, item.applicationId),
                                        eq(billingNetworkDetail.containerId, container.containerId)
                                    )
                                })
                                let usedChange = 0;
                                if (!!billingnw) {
                                    usedChange += inMb + outMb - (billingnw?.currentUsed || 0)
                                    // 更新计费详情表
                                    await tx.update(billingNetworkDetail).set({
                                        currentUsed: inMb + outMb,
                                        updateAt: new Date()
                                    }).where(and(
                                        eq(billingNetworkDetail.applicationId, item.applicationId),
                                        eq(billingNetworkDetail.containerId, container.containerId)
                                    )).returning();
                                } else {
                                    usedChange += inMb + outMb
                                    await tx.insert(billingNetworkDetail).values({
                                        applicationId: item.applicationId,
                                        containerId: container.containerId,
                                        lastUsed: 0,
                                        currentUsed: inMb + outMb,
                                        serverId: item.serverId,
                                        status: 0,
                                        updateAt: new Date()
                                    }).returning()
                                }
                                // 获取当前年月
                                const now = new Date();
                                const year = now.getFullYear();
                                let month = (now.getMonth() + 1).toString().padStart(2, '0');
                                const yearMonth = `${year}${month}`;
                                // 更新流量使用表
                                // @ts-ignore
                                await tx.insert(networkCount).values({
                                    organizationId: project?.organizationId || "",
                                    currentUsed: usedChange,
                                    all: server.freeNetwork,
                                    serverId: item.serverId,
                                    yearmonth: yearMonth,
                                }).onConflictDoUpdate({
                                    target: [networkCount.yearmonth, networkCount.organizationId, networkCount.serverId],
                                    set: {
                                        all: server.freeNetwork || 0,
                                        currentUsed: sql`${networkCount.currentUsed}
                                        +
                                        ${usedChange}`,
                                    }
                                })
                            })
                        }
                    })
                }
            }
        })
    }

    // 实际插入
    await db.insert(billingStandDetail).values(billingList).returning()

    /** 数据卷计费查询 **/
    await volumeCheck(serverList, appList);

    console.log(`[${new Date()} - 服务计费查询]计费查询服务结束`)
}

// 数据卷使用量统计
export async function volumeCheck(serverList:any, appList:any) {
    console.log(`[${new Date()} - 数据卷用量查询]服务开始`)
    for (const server of serverList) {
        if(server.serverStatus != "active") {
            continue
        }

        // 获取当前服务器上所有节点
        let nodeListresult;
        try{
            nodeListresult = await execAsyncRemoteOverServer(server, "docker node ls -q | xargs -I {} docker node inspect -f '{{.Description.Hostname}} {{.Status.Addr}}' {}");
        }catch (error){
            console.warn(`[${new Date()} - 数据卷用量查询]服务器 ${server.name} 已离线，请检查！`, error)
            continue
        }
        const nodeList = nodeListresult.stdout;
        const nodeMap = parseHostsToMap(nodeList)

        const hostnameRes= await execAsyncRemoteOverServer(server, "hostname");
        const hostname = hostnameRes.stdout.trim()


        const orgSizeMap:any = {};

        for (const [node, ip] of nodeMap){
            let volumesRes;
            if(hostname === node){
                // 主节点
                volumesRes = await execAsyncRemoteOverServer(server, "docker volume ls --format \"{{.Name}}\" | while read vol; do echo -n \"$vol-\"; du -s $(docker inspect -f '{{.Mountpoint}}' $vol) | awk '{print $1}'; done")
            }else{
                try {
                    volumesRes = await execAsyncRemoteOverServer(server, `ssh root@${node} 'docker volume ls --format "{{.Name}}" | while read vol; do echo -n "$vol-"; du -s $(docker inspect -f "{{.Mountpoint}}" "$vol") | awk "{print \\$1}"; done'`)
                }catch (error){
                    console.warn(`[${new Date()} - 数据卷用量查询]查询失败，服务器 ${server.name} - 节点 ${node} 已离线，请检查！`, error)
                    continue
                }
            }
            const volumeStr = volumesRes?.stdout.trim();
            const volumes = parseVolumeLines(volumeStr);
            for(const [name, size] of volumes) {
                // 更新大小
                const updateRes = await db.update(mounts).set({
                    size: size || 0
                }).where(eq(mounts.volumeName, name)).returning();
                if(updateRes.length > 0 ){
                    // @ts-ignore
                    const orgInfo = appList?.find(app=>app.applicationId === updateRes[0]?.applicationId)
                    if(orgSizeMap[orgInfo?.project?.organizationId]){
                        orgSizeMap[orgInfo?.project?.organizationId] += size || 0
                    }else{
                        orgSizeMap[orgInfo?.project?.organizationId] = size || 0
                    }
                }
            }
        }

        // 更新总用量
        for (const orgId in orgSizeMap){
            await db.update(organization).set({
                volumeSize: orgSizeMap[orgId]
            }).where(eq(organization.id, orgId))
        }
    }
}

// 计费扣费服务
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
            if (!!billingInfo) {
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
            for (const vc of vouchers) {
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
                await userCharge(org.ownerId, detail.amount, org.id)
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

        console.log(`[${new Date()} - 扣费并生成账单]计算资源流程结束，全部计费完成！`)

    }

    /** 流量计费 **/
    console.log(`[${new Date()} - 扣费并生成账单]开始流量计费！`)
    // 获取当前年月
    const now = new Date();
    const year = now.getFullYear();
    let month = (now.getMonth() + 1).toString().padStart(2, '0');
    const yearMonth = `${year}${month}`;
    const ntList = await db.query.networkCount.findMany({
        where: eq(networkCount.yearmonth, yearMonth)
    })
    // 获取所有服务器
    const serverList = await db.query.server.findMany();

    for (const nt of ntList) {
        if (nt.currentUsed >= nt.all) {
            let overCount = 0;
            let lastUsed = 0;
            if (nt.lastUsed === 0) {
                // 用量超过了免费流量，且没有计费过
                overCount = Math.floor((nt.currentUsed - nt.all) / 1024)
                lastUsed = nt.all + overCount * 1024
            } else {
                // 如果上次计费流量小于免费流量，从免费流量开始计费
                if(nt.lastUsed < nt.all) nt.lastUsed = nt.all;
                overCount = Math.floor((nt.currentUsed - nt.lastUsed) / 1024)
                lastUsed = nt.lastUsed + overCount * 1024
            }
            if (overCount >= 1) {
                // 扣费流量
                const server = serverList.find(item => item.serverId === nt.serverId)
                const price = Number(server?.exceedNetworkFee || 0) * overCount
                const org = orgList.find(item=>item.id === nt.organizationId)

                // 余额计费
                await userCharge(org?.ownerId || "", price, nt.organizationId || "")

                await db.update(networkCount).set({
                    lastUsed: lastUsed
                }).where(and(
                    eq(networkCount.yearmonth, nt.yearmonth || ""),
                    eq(networkCount.organizationId, nt.organizationId || ""),
                    eq(networkCount.serverId, nt.serverId || "")
                )).returning()

                // 插入实际计费表
                await db.insert(billing).values({
                    // @ts-ignore
                    type: 1,
                    amount: price,
                    applicationId: "-",
                    userId: org?.ownerId,
                    organizationId: nt.organizationId,
                    payType: 0,
                    voucherId: "-",
                }).returning()


                console.log(`[${new Date()} - 扣费并生成账单]组织ID ${nt.organizationId} 本次计费流量 ${overCount} GB, 费用 ${price}！`)
            } else {
                console.log(`[${new Date()} - 扣费并生成账单]组织ID ${nt.organizationId} 本次计费流量不超过1GB，暂不计费！`)
            }
        } else {
            console.log(`[${new Date()} - 扣费并生成账单]组织ID ${nt.organizationId} 本次没有超过免费流量限制，暂不计费！`)
        }

    }

}

// 用户余额扣费方法
async function userCharge(userId:string, amount:any, orgId:string){
    // 余额计费
    const user = await db.update(users_temp).set({
        balance: sql`${users_temp.balance}
                    -
                    ${amount}`
    }).where(eq(users_temp.id, userId)).returning().then((res: any) => res[0]);

    if (user.balance < 0) {
        // 欠费后立即停止该用户组织的全部应用
        let projectStrList : string[] = []
        const projectList = await db.query.projects.findMany({
            where: eq(projects.organizationId, orgId)
        })
        projectList.forEach(item=>{
            projectStrList.push(item.projectId)
        })
        const apps = await db.query.applications.findMany({
            where: inArray(applications.projectId, projectStrList)
        })
        for (const service of apps) {
            await stopServiceRemote(service.serverId || "", service.appName, service);
            await updateApplicationStatus(service.applicationId, "idle");
        }

    }

}