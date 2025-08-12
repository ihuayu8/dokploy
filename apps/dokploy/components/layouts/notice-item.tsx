import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {DropdownMenuItem} from "@/components/ui/dropdown-menu";
import type * as React from "react";
import {useState} from "react";
import ReactMarkdown from "react-markdown";
import {api} from "@/utils/api";

export function NoticeItem({notice, refetchNotices, noticeCheck}) {
    const [visible, setVisible] = useState(false);
    const { mutateAsync: readNotice } =
        api.user.readNotice.useMutation();

    function handlerRead(noticeId : number) {
        readNotice({
            noticeId
        }).then(() => {
            refetchNotices()
        })
    }

    return (
        <>
            <Dialog open={visible} onOpenChange={setVisible}>
                <DialogTrigger className="w-full">
                    <div key={notice?.noticeId} className="flex flex-col gap-2">
                        <DropdownMenuItem
                            className="flex flex-col justify-center items-start gap-1 p-3"
                            onSelect={(e) =>{
                                e.preventDefault();
                                handlerRead(notice?.noticeId)
                            }}
                        >
                            <div className="font-medium flex flex-row w-full">
                                <span>{notice?.title}</span>
                                {!noticeCheck?.status &&
                                    (
                                        <span className="rounded-full size-2 bg-blue-500  ml-auto animate-pulse-slow">
														</span>
                                    )
                                }
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {new Date(notice?.createdAt).toLocaleString()}
                            </div>
                            {/*<div className="text-xs text-muted-foreground">*/}
                            {/*	Role: {invitation.role}*/}
                            {/*</div>*/}
                        </DropdownMenuItem>
                    </div>
                </DialogTrigger>
                <DialogContent className="max-h-screen  overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{notice?.title}</DialogTitle>
                        <DialogDescription>
                            {new Date(notice?.createdAt).toLocaleString()}
                        </DialogDescription>
                    </DialogHeader>
                    <ReactMarkdown className="text-muted-foreground text-sm">
                        {notice?.content}
                    </ReactMarkdown>
                </DialogContent>
            </Dialog>
        </>
    )
}