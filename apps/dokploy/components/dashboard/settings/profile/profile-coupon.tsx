import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {Cable, Ticket, Calendar} from "lucide-react";
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
                                <Ticket className="size-6 text-muted-foreground self-center" />
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
                    <CardContent className="space-y-2 py-8 border-t p-10">
                        <div
                            className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 mb-6 hover:shadow-md transition-shadow duration-300">
                            <div className="flex flex-col md:flex-row">
                                <div
                                    className="w-full md:w-1/3 bg-gradient-to-br from-primary to-secondary text-white p-6 flex items-center justify-center relative coupon-dot">
                                    <div className="text-center">
                                        <div className="text-sm opacity-90 mb-1">满减券</div>
                                        <div className="text-4xl font-bold tracking-tight">
                                            <span className="text-xl align-top mr-1">¥</span>10
                                        </div>
                                        <div className="text-xs mt-2 opacity-90">满30可用</div>
                                    </div>
                                </div>

                                <div className="hidden md:block w-0 coupon-line"></div>

                                <div className="w-full md:w-2/3 p-5">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">新用户首充优惠券</h3>
                                    <p className="text-sm text-gray-600 mb-4">充值时可按要求抵扣使用</p>

                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center text-gray-500">
                                            <Calendar className="fa fa-calendar-o mr-2 w-3 text-center" />
                                            <span>有效期至：2025.08.31</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="bg-neutral px-5 py-3 flex justify-between items-center border-t border-gray-100">
                                <span className="text-xs text-gray-500">券号：20250717001</span>
                                <button
                                    className="bg-primary hover:bg-primary/90 text-white text-sm py-1.5 px-4 rounded-full transition-colors duration-200">
                                    立即使用
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </div>
            </Card>
        </div>
    )

}