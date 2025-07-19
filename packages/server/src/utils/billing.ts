import {TRPCError} from "@trpc/server";
import {
    type apiCreateApplication, server, stand,
} from "@dokploy/server/db/schema";
import {Application} from "@dokploy/server/services/application";
import {db} from "@dokploy/server/db";
import {and, asc, eq, inArray} from "drizzle-orm";

interface ContainerSize {
    stand: string,
    memoryReservation:string,
    memoryLimit:string,
    cpuReservation:string,
    cpuLimit:string,
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
    if(defaultList.length === 0){
        defaultList = await db.query.server.findMany({
            where: and(
                eq(server.allowCreate, true)
            ),
        })
    }

    // 如果还为空
    if(defaultList.length === 0){
        return null;
    }

    if(defaultList.length === 1){
        return defaultList[0]?.serverId;
    }

    const randomInt = Math.floor(Math.random() * defaultList.length);
    return defaultList[randomInt]?.serverId;
}

// 根据规格计算cpu和内存限制
export const setRealStand = async (input: typeof apiCreateApplication._type | Partial<Application>) => {
     const standard = await db.query.stand.findFirst({
        where: and(
            eq(stand.id, input.stand as string)
        ),
    });
    if(!standard){
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: "无该实例规格！"
        })
    }
    try {
        const size : ContainerSize = {
            memoryReservation: standard.memlimit || "",
            memoryLimit: standard.memlimit || "",
            cpuReservation: standard.cpulimit || "",
            cpuLimit: standard.cpulimit || "",
            stand: input.stand || ""
        }
        return size
    }catch(error){
        console.error(error)

        throw new TRPCError({
            code: 'FORBIDDEN',
            message: "无该实例规格！"
        })
    }

}

export const billingAllApplications = async (appName: string) => {

}