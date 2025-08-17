import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {NotepadText} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Props {
    applicationShopInfo: any;
}

export const ShowInstruction = ({ applicationShopInfo }: Props) => {
    return (
        <Card className="group relative w-full bg-transparent">
            <CardHeader>
                <CardTitle className="flex items-start justify-between">
                    <div className="flex flex-col gap-2">
                        <span className="flex flex-col space-y-0.5">使用说明</span>
                    </div>
                    <div className="hidden space-y-1 text-sm font-normal md:block">
                        <NotepadText className="size-6 text-muted-foreground" />
                    </div>
                </CardTitle>
                <CardContent>
                    <ReactMarkdown className="mt-5">
                        {applicationShopInfo?.instruction}
                    </ReactMarkdown>
                </CardContent>
            </CardHeader>
        </Card>
    )
}