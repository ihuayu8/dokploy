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

export const ProfileVoucher = () => {
    const { data, refetch, isLoading } = api.user.getBalance.useQuery()
    let balance = data?.balance

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
                        <div style={{display: "flex", flexDirection: "column"}}>
                            <div style={{marginBottom: "5px", display:"flex"}}>
                                <span className="text-xs" style={{fontWeight: "700"}}>新人代金券 </span>
                                <span className="text-xs text-gray-600" style={{marginLeft: "8px"}}>￥9.21 / ￥10 (已使用1.32%)</span>
                                <span className="text-xs" style={{marginLeft:'auto'}}>2025-08-12到期</span>
                            </div>
                            <Progress value={1.32} />
                        </div>
                    </CardContent>
                </div>
            </Card>
        </div>
    )

}