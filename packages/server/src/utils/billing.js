import {TRPCError} from "@trpc/server";

export const setRealStand = (input) => {
    const standard = standMap[input.stand];
    if(!standard.mem){
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: "无该实例规格！"
        })
    }
    try {

        input.memoryReservation = standard.mem;
        input.memoryLimit = standard.mem;
        input.cpuReservation = standard.cpu;
        input.cpuLimit = standard.cpu;
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
const standMap = {
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