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
import {useEffect, useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {toast} from "sonner";
import { QRCodeSVG } from 'qrcode.react';
import * as React from "react";
import {cn} from "@/lib/utils";

export const ProfileBalance = () => {
    const { data, refetch, isLoading } = api.user.getBalance.useQuery()
    let balance = data?.balance
    const [visible, setVisible] = useState(false)
    const [rechargeAmount, setRechargeAmount] = useState(0)

    const {mutateAsync, isLoading: loadingRecharge, error, isError} =
        api.user.recharge.useMutation();
    const [orderId, setOrderId] = useState("")
    const [payUrl, setPayUrl] = useState("")

    const { data:orderInfo } = api.user.getOrderStatus.useQuery(
        {orderId: orderId},
        {
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            refetchInterval: 1000,
            enabled: orderId !== ""
        }
    )

    useEffect(() => {
        if(orderInfo?.status === "1"){
            refetch()
            setVisible(false)
            setOrderId("")
            setPayUrl("")
            toast.success(`成功充值${orderInfo?.amount}元`);
        }
    }, [orderInfo]);

    // 添加金额输入处理函数
    const handleAmountChange = () => {
        // 只允许数字和小数点，且最多两位小数
        if (/^\d*(\.\d{0,2})?$/.test(String(rechargeAmount)) && rechargeAmount > 0) {
            return true
        }
        return false
    };

    const handleRecharge = () => {
        if(!handleAmountChange()){
            toast.error("请输入正确的金额");
            return
        }
        mutateAsync({
            amount: rechargeAmount
        }).then(res=>{
            setPayUrl(res.payUrl)
            setOrderId(res.orderId)
        }).catch(err=>{
            toast.error("订单创建失败，请稍后再试！")
        })
        setVisible(true)
    }

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
                            value={rechargeAmount}
                            type="number"
                            onChange={amount => setRechargeAmount(Number(amount.target.value))}
                        />
                        <div className="flex items-center justify-end gap-2" style={{marginTop: "1rem"}}>
                            <Button type="submit" onClick={handleRecharge}>
                                <BadgeJapaneseYen className="size-4 text-muted" />
                                立即充值
                            </Button>
                        </div>
                    </CardContent>
                </div>
            </Card>
            <Dialog open={visible} onOpenChange={setVisible}>
                <DialogContent className="max-h-screen  overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>充值</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col justify-center items-center gap-2">
                        {loadingRecharge ? <div>创建订单中，请稍等...</div> : (<><QRCodeSVG
                            value={payUrl}
                            size={200}
                            fgColor="#24292e"
                            bgColor="#f6f8fa"
                            level="H"
                            includeMargin={true}/>
                            <div className="flex items-center justify-end gap-4">
                                <img
                                    src="/images/alipay.svg"
                                    className={cn(
                                        "object-contain",
                                        "size-10",
                                    )}
                                />
                                <img
                                    src="/images/weichat.svg"
                                    className={cn(
                                        "object-contain",
                                        "size-10",
                                    )}
                                />
                                <img
                                    src="/images/yun.svg"
                                    className={cn(
                                        "object-contain",
                                        "size-10",
                                    )}
                                />
                            </div>
                            <div className="text-gray-500 text-sm">请使用 微信/支付宝/云闪付 APP扫码支付</div>
                            <div>订单已生成，请在3分钟内完成支付</div>
                        </>)
                        }

                    </div>

                </DialogContent>
            </Dialog>
        </div>
    )

}