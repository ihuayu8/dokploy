import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {BadgeJapaneseYen, Wallet} from "lucide-react";
import { api } from "@/utils/api";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

export const ProfileBalance = () => {
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
                                <Wallet className="size-6 text-muted-foreground self-center" />
                                余额
                            </CardTitle>
                            <CardDescription>
                                管理您的账户余额
                            </CardDescription>
                        </div>
                        <span style={{fontWeight: 700}}>￥{ balance }</span>
                    </CardHeader>
                    <CardContent className="space-y-2 py-8 border-t">
                        <Input
                            placeholder="请输入充值金额"

                        />
                        <div className="flex items-center justify-end gap-2" style={{marginTop: "1rem"}}>
                            <Button type="submit">
                                <BadgeJapaneseYen className="size-4 text-muted" />
                                立即充值
                            </Button>
                        </div>
                    </CardContent>
                </div>
            </Card>
        </div>
    )

}