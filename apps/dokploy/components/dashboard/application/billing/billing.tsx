import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Progress} from "@/components/ui/progress";
import {TooltipContent, TooltipProvider, TooltipTrigger, Tooltip} from "@/components/ui/tooltip";
import {FormLabel} from "@/components/ui/form";
import {HelpCircle} from "lucide-react";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {api} from "@/utils/api";

interface Props {
    id: string;
    type: "application" | "compose";
}

export const ShowBilling = ({id, type}: Props) => {
    const freeVolume = 1024 * 1024;

    function formatSize(kb) {
        // 验证输入是否为有效数字
        if (typeof kb !== 'number' || isNaN(kb) || kb < 0) {
            return 'Invalid size';
        }

        // 定义单位和换算比例
        const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
        let size = kb;
        let unitIndex = 0;

        // 转换到最合适的单位
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        // 根据单位选择合适的小数位数
        const decimalPlaces = unitIndex === 0 ? 0 : 2;

        // 格式化数字并拼接单位
        return `${size.toFixed(decimalPlaces)} ${units[unitIndex]}`;
    }

    const { data } = api.application.getBillings.useQuery(
        {
            applicationId: id,
        },
        {
            enabled: !!id,
        },
    )
    const gettypeText = (type: Number) => {
        switch (type) {
            case 0:
                return "计算资源";
            case 1:
                return "网络流量";
            case 2:
                return "数据卷储存";
            default:
                return "未知";
        }
    }

    function mbToGb(mb) {
        // 1GB = 1024MB
        const gb = mb / 1024;
        // 保留两位小数
        return parseFloat(gb.toFixed(2));
    }
    
    return (
        <div className="flex w-full flex-col gap-5 ">
            <Card className="bg-background">
                <CardHeader className="flex flex-row items-center flex-wrap gap-4 justify-between">
                    <div className="flex flex-col gap-1">
                        <CardTitle className="text-xl">账单</CardTitle>
                        <CardDescription>
                            查看该应用的实际消费情况
                        </CardDescription>
                    </div>
                    <div className="flex flex-col md:flex-row  gap-4 w-full md:w-1/2">
                        <div className="flex flex-col w-full">
                            <div style={{marginBottom: "5px", display: "flex"}}>
                                <span className="text-xs" style={{fontWeight: "700"}}>免费流量 </span>
                                <span className="text-xs" style={{marginLeft: 'auto'}}>
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="flex flex-row gap-1 items-center">
                                                    {mbToGb(data?.netUsed.currentUsed)}GB / {mbToGb(data?.netUsed.all)}GB(已使用{data?.netUsed.all === 0 ? 100 : parseFloat((data?.netUsed.currentUsed / data?.netUsed.all).toFixed(2)) * 100}%)
                                                <HelpCircle className="size-4 text-muted-foreground"/>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent
                                                className="z-[999] w-[400px]"
                                                align="start"
                                                side="top"
                                            >
                                                <span>
                                                    您在该节点上的所有应用共享免费流量额度，超出后将按照节点标注的价格收费，流量费用无法使用代金券支付。
                                                </span>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </span>
                            </div>
                            <Progress value={data?.netUsed.all === 0 ? 100 : parseFloat((data?.netUsed.currentUsed / data?.netUsed.all).toFixed(2)) * 100}/>
                        </div>
                        <div className="flex flex-col w-full">
                            <div style={{marginBottom: "5px", display: "flex"}}>
                                <span className="text-xs" style={{fontWeight: "700"}}>免费数据卷 </span>
                                <span className="text-xs" style={{marginLeft: 'auto'}}>
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="flex flex-row gap-1 items-center">
                                                    {formatSize(data?.volumeSize.volumeSize)} / {formatSize(freeVolume)}
                                                    (已使用{parseFloat((data?.volumeSize.volumeSize/ freeVolume).toFixed(2)) * 100}%)
                                                <HelpCircle className="size-4 text-muted-foreground"/>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent
                                                className="z-[999] w-[400px]"
                                                align="start"
                                                side="top"
                                            >
                                                <span>
                                                    您的账户内所有应用共享免费存储数据卷容量。
                                                </span>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </span>
                            </div>
                            <Progress value={parseFloat((data?.volumeSize.volumeSize/ freeVolume).toFixed(2)) * 100}/>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex w-full flex-row gap-4">
                    <Table>
                        <TableCaption>只展示最近100条内容</TableCaption>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">计费ID</TableHead>
                                <TableHead className="w-[200px] text-center">计费内容</TableHead>
                                <TableHead className="text-center">计费金额</TableHead>
                                <TableHead className="w-[180px] text-center">资源ID</TableHead>
                                <TableHead className="w-[100px] text-center">计费方式</TableHead>
                                <TableHead className="text-right">计费时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.billingList?.map((billing) => {
                                return (
                                    <TableRow key={billing.id}>
                                        <TableCell className="w-[100px]">
                                            {billing.id}
                                        </TableCell>
                                        <TableCell className="w-[200px] text-center">
                                            {gettypeText(billing.type)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            ￥{billing.amount}
                                        </TableCell>
                                        <TableCell className="w-[180px] text-center">
                                            {billing.resourceId}
                                        </TableCell>
                                        <TableCell className="w-[100px] text-center">
                                            {billing.payType === 0 ? '账户余额' : '代金券'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {billing.createdAt.toString()}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}