import {Container, readStatsFile} from "@dokploy/server/monitoring/utils";
import {execAsyncRemote, execAsyncRemoteOverServer} from "@dokploy/server/utils/process/execAsync";
import {findServerById} from "@dokploy/server/services/server";

interface ResourceValues {
    limits?: {
        NanoCPUs?: number;
        MemoryBytes?: number;
    };
    reservations?: {
        NanoCPUs?: number;
        MemoryBytes?: number;
    };
    error?: string;
}

export const getContainerState = async (
    containerId: string,
    containerName: string,
    serverId: string,
    node: string,
    appName: string
) => {
    // 获取节点列表和对应IP
    const server = await findServerById(serverId);
    const nodeListresult = await execAsyncRemoteOverServer(server, "docker node ls -q | xargs -I {} docker node inspect -f '{{.Description.Hostname}} {{.Status.Addr}}' {}");
    const nodeList = nodeListresult.stdout;
    const nodeMap = parseHostsToMap(nodeList)
    const nodeIp:string = nodeMap.get(node) || ""
    if (nodeIp === "") {
        console.error("No node ip address found.");
        return null
    }

    // 获取容器资源限制
    const rsResult = await execAsyncRemoteOverServer(server, `docker service inspect ${appName}`);
    const reStr = rsResult.stdout;
    const resource = getResourceLimit(reStr)
    const memStr = formatBytes(resource.MemoryBytes)


    // 请求url获取容器的相关信息
    const infoRes= await execAsyncRemoteOverServer(server, `curl http://${nodeIp}:8080/api/v2.0/stats/${containerName}?type=docker`)

    let cpu: any[] = []
    let memory: any[] = []
    let disk: any[] = []
    let network: any[] = []
    let block: any[] = []
    const containerInfo = JSON.parse(infoRes.stdout) as any;
    Object.entries(containerInfo).forEach(([key, value]) => {
        const arr = value as Array<any>;
        arr.forEach((item) => {
            const realCpu = (item?.cpu_inst?.usage?.total / resource.NanoCPUs)*100
            cpu.push({
                time:item?.timestamp,
                value: ((realCpu >= 100 ? 100 : realCpu).toFixed(2)) + "%"
            })
            memory.push({
                time:item?.timestamp,
                value:{
                    used: formatBytes(item?.memory?.usage),
                    total: memStr
                }
            })
            block.push({
                time:item?.timestamp,
                value:{
                    readMb: item?.diskio?.io_service_bytes ? (bytesToMB(item?.diskio?.io_service_bytes[0]?.stats?.Read)) : "0MB",
                    writeMb: item?.diskio?.io_service_bytes ? (bytesToMB(item?.diskio?.io_service_bytes[0]?.stats?.Write)) : "0MB",
                }
            })

            disk.push({
                time:item?.timestamp,
                value:{
                    diskTotal: server.defaultDisk,
                    diskUsage: parseFloat(bytesToGB(item?.filesystem[0]?.usage)),
                    // @ts-ignore
                    diskFree: (server.defaultDisk || 1) - parseFloat(bytesToGB(item?.filesystem[0]?.usage)),
                    // @ts-ignore
                    diskUsedPercentage: parseFloat((parseFloat(bytesToGB(item?.filesystem[0]?.usage)) / (server.defaultDisk || 1)).toFixed(2)) * 100,
                }
            })

            //统计网络接口信息
            if(item?.network?.interfaces && item?.network?.interfaces?.length > 0){
                let inputByte = 0;
                let outputByte = 0;
                item?.network?.interfaces?.forEach((inter:any) => {
                    inputByte += inter?.rx_bytes;
                    outputByte += inter?.tx_bytes;
                })
                network.push({
                    time:item?.timestamp,
                    value:{
                        inputMb: bytesToMB(inputByte, 2),
                        outputMb: bytesToMB(outputByte, 2),
                    }
                })

            }
        })
    })

    return {
        cpu: cpu,
        memory: memory,
        disk: disk,
        network: network,
        block: block
    };


}

function getResourceLimit(jsonString:string){
    try {
        const data = JSON.parse(jsonString);
        if (!Array.isArray(data) || data.length === 0) {
            return { error: '输入的JSON不是一个包含元素的数组' };
        }

        const service = data[0] as any;
        const resources = service?.Spec?.TaskTemplate?.Resources;

        if (!resources) {
            return { error: '找不到资源配置' };
        }

        return {
                NanoCPUs: resources.Limits?.NanoCPUs,
                MemoryBytes: resources.Limits?.MemoryBytes
            };
    } catch (error) {
        return { error: `解析JSON时出错: ${(error as Error).message}` };
    }
}

enum ByteUnit {
    B = 'B',
    KiB = 'KiB',
    MiB = 'MiB',
    GiB = 'GiB',
    TiB = 'TiB'
}

function utcToBeijing(utcTime: string): string {
    try {
        // 处理可能的ISO 8601格式中的Z后缀
        const normalizedUtcTime = utcTime.endsWith('Z')
            ? utcTime
            : utcTime + 'Z';

        // 创建Date对象（自动处理UTC时间）
        const date = new Date(normalizedUtcTime);

        // 检查日期是否有效
        if (isNaN(date.getTime())) {
            throw new Error('Invalid UTC time format');
        }

        // 获取北京时间（UTC+8）
        const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);

        // 格式化输出为本地字符串
        return beijingTime.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Shanghai'
        });
    } catch (error) {
        console.error('Error converting UTC to Beijing time:', error);
        return 'Invalid Date';
    }
}

function formatBytes(bytes: number, decimals: number = 2): string {
    if (isNaN(bytes)) {
        throw new Error('Invalid input: bytes must be a valid number');
    }

    if (bytes < 0) {
        throw new Error('Invalid byte count: must be a non-negative number');
    }

    if (bytes === 0) return '0 B';

    const k = 1024;
    const units: ByteUnit[] = [ByteUnit.B, ByteUnit.KiB, ByteUnit.MiB, ByteUnit.GiB, ByteUnit.TiB];
    const i = Math.min(
        Math.floor(Math.log(bytes) / Math.log(k)),
        units.length - 1
    );

    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
    return `${size} ${units[i]}`;
}

function bytesToMB(bytes: number, decimalPlaces: number = 0): string {
    if (bytes === 0) return '0 MB';

    const mb = bytes / (1024 * 1024);
    return mb.toFixed(decimalPlaces) + ' MB';
}

function bytesToGB(bytes: number, decimalPlaces: number = 2): string {
    if (bytes === 0) return '0 GB';

    const mb = bytes / (1024 * 1024 * 1024);
    return mb.toFixed(decimalPlaces);
}

export function parseHostsToMap(hostsString:string) {
    const lines = hostsString.trim().split('\n');
    const resultMap = new Map<string, string>();

    for (const line of lines) {
        // 用正则表达式匹配主机名和IP地址
        const match = line.match(/^(\S+)\s+(\S+)/);
        if (match) {
            const hostname:string = match[1] || "";
            const ip:string = match[2] || "";
            resultMap.set(hostname, ip);
        }
    }

    return resultMap;
}

export function parseVolumeLines(inputString:any) {
    const volumeMap:Map<string, any> = new Map();

    // 将输入字符串按行拆分
    const lines = inputString.split('\n');

    // 遍历每一行
    lines.forEach((line:any, index:any) => {
        // 去除行首尾空白字符
        const trimmedLine = line.trim();

        // 跳过空行
        if (trimmedLine === '') return;

        // 使用正则表达式匹配名称和大小部分
        const match = trimmedLine.match(/(.*)-(\d+)$/);

        if (match && match.length === 3) {
            const name = match[1];
            const size = parseInt(match[2], 10);
            volumeMap.set(name, size);
        } else {
            console.warn(`第 ${index + 1} 行无法解析: "${trimmedLine}"`);
        }
    });

    return volumeMap;
}