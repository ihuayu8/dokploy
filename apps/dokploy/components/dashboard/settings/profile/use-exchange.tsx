import {BadgeJapaneseYen, Cable} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {useState} from "react";
import {Input} from "@/components/ui/input";
import * as React from "react";
import {api} from "@/utils/api";
import {toast} from "sonner";


export const UseExchange = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [exchangeCode, setExchangeCode] = useState("");
    const exchangeMutation = api.user.exchangeCode.useMutation({
        onSuccess: (data) => {
            toast.success("兑换成功")
            setIsOpen(false)
        },
        onError: (e) => {
            toast.error(e.shape?.message)
            console.error(e)
        },
    })

    const handleExchange = async () => {
        if (!exchangeCode) {
            return;
        }
        exchangeMutation.mutate({
            code: exchangeCode,
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost">
                    <Cable className="size-4 text-muted-foreground" />
                    使用兑换码
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-screen overflow-y-auto sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>使用兑换码</DialogTitle>
                    <DialogDescription>输入兑换码以获取奖励</DialogDescription>
                </DialogHeader>
                <Input
                    placeholder="请输入兑换码"
                    value={exchangeCode}
                    onChange={amount => setExchangeCode(amount.target.value)}
                />
                <div className="flex items-center justify-end gap-2" style={{marginTop: "1rem"}}>
                    <Button type="submit" isLoading={exchangeMutation.isLoading} onClick={handleExchange}>
                        立即兑换
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )

}