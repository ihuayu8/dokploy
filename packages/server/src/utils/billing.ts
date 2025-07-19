import {TRPCError} from "@trpc/server";
import {
    type apiCreateApplication, server,
} from "@dokploy/server/db/schema";
import {Application} from "@dokploy/server/services/application";
import {db} from "@dokploy/server/db";
import {and, eq} from "drizzle-orm";

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
export const setRealStand = (input: typeof apiCreateApplication._type | Partial<Application>) => {
    const standard = standMap[input.stand || ""] || {
        cpu: null,
        mem: null
    };
    if(!standard.mem){
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: "无该实例规格！"
        })
    }
    try {
        const size : ContainerSize = {
            memoryReservation: standard.mem,
            memoryLimit: standard.mem,
            cpuReservation: standard.cpu,
            cpuLimit: standard.cpu,
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