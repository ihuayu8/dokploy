import {db} from "@dokploy/server/db";
import {
    applications,
    applicationShopInfo,
    apiCreateApplicationShop,
    domains,
    applicationShopDomains, createSchemaShop, applicationShopports,
    appliationShopMounts, mounts
} from "@dokploy/server/db/schema";
import {asc, desc, eq, and} from "drizzle-orm";
import {TRPCError} from "@trpc/server";
import {applicationShopVersion} from "@dokploy/server/db/schema/application-shop-version";

export type ApplicationShopInfo = typeof applicationShopInfo.$inferSelect;

export const createApplicationTemplate = async (
    input: typeof apiCreateApplicationShop._type,
    userId: string,
) => {
    // 检查sourceTyoe是否为docker
    const sourceApp = await db.query.applications.findFirst({
        where: eq(applications.applicationId, input.applicationId)
    })
    if(sourceApp?.sourceType !== 'docker') {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "仅允许将构建源为docker的应用保存为模板",
        })
    }

    return await db.transaction(async (tx) => {
        // 创建应用
        let newApplicationShopInfo;
        if(input.addType !== 'addToVersion') {
            // @ts-ignore
            delete input.appShopId
            newApplicationShopInfo = await tx
                .insert(applicationShopInfo)
                // @ts-ignore
                .values({
                    ...input,
                    userId,
                    intime: new Date().toISOString()
                })
                .returning()
                .then((value) => value[0]);
        }


        // 创建版本
        const version = await tx.insert(applicationShopVersion)
            // @ts-ignore
            .values({
                ...sourceApp,
                versionNum: input.versionNum,
                appShopId: input?.appShopId || newApplicationShopInfo?.appShopId,
                intime: new Date().toISOString()
            })
            .returning()
            .then((value) => value[0]);

        // 创建域名模板
        const domainList = await tx.query.domains.findMany({
            where:eq(domains.applicationId, input.applicationId)
        })
        if(domainList.length > 0){
            const shopDomainList : any = []
            domainList.forEach(item => {
                let tmp:any = {...item};
                delete tmp.domainId;
                shopDomainList.push({
                    ...tmp,
                    versionId: version?.versionId
                })
            })
            await tx.insert(applicationShopDomains).values(shopDomainList)
        }

        // 创建数据卷模板
        const mountList = await tx.query.mounts.findMany({
            where:eq(mounts.applicationId, input.applicationId)
        })
        if(mountList.length > 0){
            const shopMountList : any = []
            mountList.forEach(item => {
                let tmp:any = {...item};
                delete tmp.mountId;
                shopMountList.push({
                    ...tmp,
                    versionId: version?.versionId
                })
            })
            await tx.insert(appliationShopMounts).values(shopMountList)
        }

        // 创建端口模板
        const portList = await tx.query.ports.findMany({
            where:eq(domains.applicationId, input.applicationId)
        })
        if(portList.length > 0){
            const shopPortList : any = []
            portList.forEach(item => {
                let tmp:any = {...item};
                delete tmp.portId;
                shopPortList.push({
                    ...tmp,
                    versionId: version?.versionId
                })
            })
            await tx.insert(applicationShopports).values(shopPortList)
        }
    })
}

export const allApps = async (
    order: string
) => {
    let orderExpress = [desc(applicationShopInfo.installNum)];
    if(order === "intime-desc") {
        orderExpress = [desc(applicationShopInfo.intime)];
    }else if(order === "name-asc") {
        orderExpress = [asc(applicationShopInfo.name)];
    }else if(order === "name-desc") {
        orderExpress = [desc(applicationShopInfo.name)];
    }

    const apps =  await db.query.applicationShopInfo.findMany(
        {
            where: eq(applicationShopInfo.status, "1"),
            orderBy: orderExpress
        }
    );
    return apps;
}

export const allTags = async (

) => {

    const apps =  await db.query.appTags.findMany(
        {
        }
    );
    return apps;
}

export const getMyApps = async (
    userId: string,
) => {

    const apps =  await db.query.applicationShopInfo.findMany(
        {
            where: eq(applicationShopInfo.userId, userId)
        }
    );
    return apps;
}

export const getTempUpVersions = async (
    appShopId: number,
) => {
    const apps =  await db.query.applicationShopVersion.findMany(
        {
            where: and(
                eq(applicationShopVersion.appShopId, appShopId),
                eq(applicationShopVersion.status, '1')
            ),
            orderBy: [desc(applicationShopVersion.intime)]
        }
    );
    return apps;
}