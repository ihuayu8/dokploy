import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {Cable, ReceiptJapaneseYen} from "lucide-react";
import { api } from "@/utils/api";
import {Button} from "@/components/ui/button";
import {Progress} from "@/components/ui/progress";
import {useEffect, useState} from "react";
import {UseExchange} from "@/components/dashboard/settings/profile/use-exchange";

export const ProfileVoucher = () => {
    const [ voucherList, setVoucherList] = useState([])
    const { data, refetch, isLoading } = api.user.getVouchers.useQuery()
    const {data: servers} = api.server.withSSHKey.useQuery();
    const getServersName = (serverIds: string[]) => {
        const serverNames = servers?.filter((item) => serverIds?.includes(item.serverId)).map((item) => item.name);
        return serverNames?.join(",");
    }
    useEffect(()=>{
        setVoucherList(data || [])
    }, [isLoading])

    // @ts-ignore
    return (
        <div className="w-full">
            <Card className="h-full bg-sidebar  p-2.5 rounded-xl  max-w-5xl mx-auto">
                <div className="rounded-xl bg-background shadow-md ">
                    <CardHeader className="flex flex-row gap-2 flex-wrap justify-between items-center">
                        <div>
                            <CardTitle className="text-xl flex flex-row gap-2">
                                <ReceiptJapaneseYen className="size-6 text-muted-foreground self-center" />
                                代金券
                            </CardTitle>
                            <CardDescription>
                                可以代替余额进行使用
                            </CardDescription>
                        </div>
                        <UseExchange />
                    </CardHeader>
                    <CardContent className="space-y-2 py-8 border-t">
                        {voucherList?.length === 0 && (
                            <div className="text-center text-gray-500">
                                暂无代金券
                            </div>
                        )}
                        {voucherList.map((item)=>(
                            <div style={{display: "flex", flexDirection: "column", marginBottom: "2rem"}} key={item.voucherId}>
                                <div style={{marginBottom: "5px", display:"flex"}}>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold mb-1">{item.vName} </span>
                                        <span className="text-xs text-gray-600">
                                        ￥{item.balance} / ￥{item.amount}
                                            (已使用{parseFloat(((item.amount - item.balance)/item.amount).toFixed(4)) * 100}%)
                                        </span>
                                    </div>
                                    <div className="flex flex-col ml-auto items-end">
                                        <span className="text-xs mb-1">{new Date(item.expiry).toLocaleString()}到期</span>
                                        {item.serverIds && <div className="text-xs text-amber-700">仅可用于[{getServersName(item.serverIds)}]</div>}
                                    </div>
                                </div>
                                <Progress value={parseFloat(((item.amount - item.balance)/item.amount).toFixed(4)) * 100} />
                            </div>
                        ))}
                    </CardContent>
                </div>
            </Card>
        </div>
    )

}