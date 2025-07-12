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

export const ProfileCoupon = () => {
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
                                优惠券
                            </CardTitle>
                            <CardDescription>
                                充值时可享受优惠
                            </CardDescription>
                        </div>
                        <Button variant="ghost">
                            <Cable className="size-4 text-muted-foreground" />
                            使用兑换码
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-2 py-8 border-t">
                        <span>￥{ balance }</span>
                    </CardContent>
                </div>
            </Card>
        </div>
    )

}