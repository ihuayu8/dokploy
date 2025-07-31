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
    let stdList:any = [];
    const serverInfo = await db.query.server.findFirst({
        where: eq(server.serverId, input.serverId || ""),
    });

    if(!!serverInfo && !!serverInfo.standList && serverInfo.standList.length > 0){
        stdList = await db.query.stand.findMany({
            orderBy: asc(stand.num),
            where: inArray(stand.id, serverInfo.standList),
        });
    }else{
        stdList = await db.query.stand.findMany({
            orderBy: asc(stand.num),
        });
    }
    // @ts-ignore
    const standard = stdList.find(item => item.id === input.stand)
    if(!standard){
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: "无该实例规格！"
        })
    }
    try {
        const size : ContainerSize = {
            memoryReservation: standard.memlimit,
            memoryLimit: standard.memlimit,
            cpuReservation: standard.cpulimit,
            cpuLimit: standard.cpulimit,
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

export function getRandomPort() {
    // 计算范围大小：49000 - 10000 + 1 = 39001
    const range = 39001;
    // 生成 0 到 range-1 之间的随机整数，再加上最小值 10000
    return Math.floor(Math.random() * range) + 10000;
}

// 1GB = 1073741824 bytes 1MB = 1048576
// 1 CPUs = 1000000000
const standMap : ResourceConfig = {
    "0":{
        "cpu": "200000000",
        "mem": "134217728"
    },
    "1":{
        "cpu": "400000000",
        "mem": "268435456"
    },
    "2":{
        "cpu": "800000000",
        "mem": "536870912"
    },
    "3":{
        "cpu": "1000000000",
        "mem": "1073741824"
    },
    "4":{
        "cpu": "1500000000",
        "mem": "2147483648"
    },
    "5":{
        "cpu": "2000000000",
        "mem": "4294967296"
    },
    "6":{
        "cpu": "4000000000",
        "mem": "8589934592"
    },
}