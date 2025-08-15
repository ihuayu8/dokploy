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
import {UseExchange} from "@/components/dashboard/settings/profile/use-exchange";

export const ProfileCoupon = () => {
    const { data:coupons, refetch, isLoading } = api.user.getCoupons.useQuery()

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
                        <UseExchange />
                    </CardHeader>
                    <CardContent className="space-y-2 py-8 border-t p-10">
                        {coupons?.map((coupon) => (
                            <div
                                key={coupon.id}
                                className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 mb-6 hover:shadow-md transition-shadow duration-300">
                                <div className="flex flex-col md:flex-row">
                                    <div
                                        className="w-full md:w-1/3 bg-blue-300 from-primary to-secondary text-white p-6 flex items-center justify-center relative coupon-dot">
                                    <div className="text-center">
                                        <div className="text-sm opacity-90 mb-1">{coupon.type === 1 ? '折扣券' : '满减券'}</div>
                                        <div className="text-4xl font-bold tracking-tight">
                                            {coupon.type === 1 ? (
                                                <>
                                                    <span
                                                    className="text-xl align-top mr-1">{coupon.discountRate * 10}折</span></>
                                            ) : (
                                                <>
                                                <span className="text-xl align-top mr-1">¥</span><span>{coupon.reduced}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="text-xs mt-2 opacity-90">满{coupon.threshold}元可用{coupon.highest &&<span>, 最高抵扣{coupon.highest}元</span>}</div>

                                    </div>
                                </div>

                                <div className="hidden md:block w-0 coupon-line"></div>

                                <div className="w-full md:w-2/3 p-5">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{coupon.name}</h3>
                                    <p className="text-sm text-gray-600 mb-4">{coupon.desc}</p>

                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center text-gray-500">
                                            <Calendar className="fa fa-calendar-o mr-2 w-3 text-center" />
                                            <span>有效期至：{new Date(coupon.expiredAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="bg-neutral px-5 py-3 flex justify-between items-center border-t border-gray-100">
                                <span className="text-xs text-gray-500">券号：{coupon.id}</span>
                                {/*<button*/}
                                {/*    className="bg-primary hover:bg-primary/90 text-white text-sm py-1.5 px-4 rounded-full transition-colors duration-200">*/}
                                {/*    立即使用*/}
                                {/*</button>*/}
                            </div>
                        </div>
                        ))}
                    </CardContent>
                </div>
            </Card>
        </div>
    )

}