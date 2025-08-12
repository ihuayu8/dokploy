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

export const ProfileVoucher = () => {
    const [ voucherList, setVoucherList] = useState([])
    const { data, refetch, isLoading } = api.user.getVouchers.useQuery()
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
                        <Button variant="ghost">
                            <Cable className="size-4 text-muted-foreground" />
                            使用兑换码
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-2 py-8 border-t">
                        {voucherList.map((item)=>(
                            <div style={{display: "flex", flexDirection: "column", marginBottom: "1rem"}} key={item.voucherId}>
                                <div style={{marginBottom: "5px", display:"flex"}}>
                                    <span className="text-xs" style={{fontWeight: "700"}}>{item.vName} </span>
                                    <span className="text-xs text-gray-600" style={{marginLeft: "8px"}}>
                                        ￥{item.balance} / ￥{item.amount}
                                        (已使用{parseFloat(((item.amount - item.balance)/item.amount).toFixed(4)) * 100}%)
                                    </span>
                                    <span className="text-xs" style={{marginLeft:'auto'}}>{item.expiry}到期</span>
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