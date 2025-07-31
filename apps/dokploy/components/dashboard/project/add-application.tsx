import {AlertBlock} from "@/components/shared/alert-block";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {DropdownMenuItem} from "@/components/ui/dropdown-menu";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {slugify} from "@/lib/slug";
import {api} from "@/utils/api";
import {zodResolver} from "@hookform/resolvers/zod";
import {Folder, HelpCircle} from "lucide-react";
import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {useForm} from "react-hook-form";
import {toast} from "sonner";
import {z} from "zod";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Label} from "@/components/ui/label";

const AddTemplateSchema = z.object({
    name: z.string().min(1, {
        message: "请输入应用名称",
    }),
    appName: z
        .string()
        .min(1, {
            message: "App name is required",
        })
        .regex(/^[a-z](?!.*--)([a-z0-9-]*[a-z])?$/, {
            message:
                "App name supports lowercase letters, numbers, '-' and can only start and end letters, and does not support continuous '-'",
        }),
    description: z.string().optional(),
    serverId: z.string().optional(),
    stand: z.string().optional(),
    versionId: z.string().optional(),
    useTemplate: z.boolean().optional(),
    appShopId: z.number().optional(),
});

type AddTemplate = z.infer<typeof AddTemplateSchema>;

interface Props {
    projectId: string;
    projectName?: string;
    useTemplate?: boolean;
    visibleOut?: boolean;
    setVisibleOut?: Dispatch<SetStateAction<boolean>>;
    appShopId?: string;
    appShopName?: string;
    setTempVisible?: Dispatch<SetStateAction<boolean>>;
}

export const AddApplication = ({
                                   projectId, projectName, useTemplate = false,
                                   visibleOut, setVisibleOut, appShopId, appShopName,
                                   setTempVisible
                               }: Props) => {
    const utils = api.useUtils();
    let [visible, setVisible] = useState(false);
    if (setVisibleOut) {
        visible = visibleOut
        setVisible = setVisibleOut
    }
    const slug = slugify(projectName);
    const {data: servers} = api.server.withSSHKey.useQuery();

    const {data: versions} = api.applicationShop.getTempUpVersions.useQuery({
        appShopId: appShopId
    }, {
        enabled: useTemplate && !!appShopId
    });

    const [showTip, setShowTip] = useState(false);

    const {mutateAsync, isLoading, error, isError} =
        api.application.create.useMutation();

    const form = useForm<AddTemplate>({
        defaultValues: {
            name: "",
            appName: `${slug}-`,
            description: "",
            serverId: " ",
            useTemplate: false,
            appShopId: "",
            stand: "0",
            versionId: ""
        },
        resolver: zodResolver(AddTemplateSchema),
    });

    useEffect(() => {
        if(versions?.length > 0){
            console.log("setVersion")
            form.setValue("versionId", versions[0].versionId)
        }

    }, [versions]);

    useEffect(() => {
        form.setValue("appShopId", appShopId)
    }, [appShopId]);

    const {data: standList} = api.server.getServerStands.useQuery(
        {
            serverId: form.watch().serverId,
        },
        {enabled: true}
    );

    useEffect(() => {
        form.setValue("serverId", servers?.[0].serverId || " ")
    }, [servers]);

    useEffect(() => {
        form.setValue("stand", standList?.[0].id || "1")
    }, [standList]);


    // 当选择服务节点的时候
    useEffect(() => {
        // 检查servers是否存在并包含符合条件的项
        const hasMatchingServer = servers?.some(item =>
            item.serverId === form.getValues().serverId && item.type === '1'
        );

        setShowTip(!!hasMatchingServer);

    }, [form.watch().serverId])

    const getPrice = () => {
        const price = standList?.find(item => item.id === (form.watch().stand))?.price;
        let rate = servers?.find(item => item.serverId === form.watch().serverId)?.rate;
        return parseFloat((parseFloat(price) * parseFloat(rate)).toFixed(4));
    }

    const onSubmit = async (data: AddTemplate) => {
        await mutateAsync({
            name: data.name,
            appName: data.appName,
            description: data.description,
            projectId,
            serverId: data.serverId,
            stand: data.stand,
            useTemplate: useTemplate,
            appShopId: data.appShopId,
            versionId: data.versionId,
        })
            .then(async () => {
                toast.success("服务创建成功");
                form.reset();
                setVisible(false);
                if(!!setTempVisible){
                    setTempVisible(false)
                }
                await utils.project.one.invalidate({
                    projectId,
                });
            })
            .catch(() => {
                toast.error("服务创建失败");
            });
    };

    return (
        <Dialog open={visible} onOpenChange={setVisible}>
            {useTemplate ? '' : <DialogTrigger className="w-full">
                <DropdownMenuItem
                    className="w-full cursor-pointer space-x-3"
                    onSelect={(e) => e.preventDefault()}
                >
                    <Folder className="size-4 text-muted-foreground"/>
                    <span>应用</span>
                </DropdownMenuItem>
            </DialogTrigger>}
            <DialogContent className="max-h-screen  overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{useTemplate ? '使用模板创建应用' : '创建'}</DialogTitle>
                    <DialogDescription>
                        {useTemplate ? '使用模板[' + appShopName + ']快速创建应用' : '为你的应用程序分配一个名称和描述'}
                    </DialogDescription>
                </DialogHeader>
                {isError && <AlertBlock type="error">{error?.message}</AlertBlock>}
                <Form {...form}>
                    <form
                        id="hook-form"
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="grid w-full gap-4"
                    >
                        {useTemplate ?
                            <FormField
                                control={form.control}
                                name="versionId"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel
                                            className="break-all w-fit flex flex-row gap-1 items-center">
                                            选择应用版本
                                        </FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="选择一个版本"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    {versions?.map((version) => (
                                                        <SelectItem
                                                            key={version.versionId}
                                                            value={version.versionId}
                                                        >
                                                            <span>{version.versionNum}</span>
                                                        </SelectItem>
                                                    ))}
                                                    <SelectLabel>镜像[{appShopName}]可用版本有({versions?.length})个</SelectLabel>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            /> : ''}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>名称</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="请输入服务名称"
                                            {...field}
                                            onChange={(e) => {
                                                const val = e.target.value?.trim() || "";
                                                const serviceName = slugify(val);
                                                form.setValue("appName", `${slug}-${serviceName}`);
                                                field.onChange(val);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="serverId"
                            render={({field}) => (
                                <FormItem>
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <FormLabel className="break-all w-fit flex flex-row gap-1 items-center">
                                                    选择服务集群
                                                    <HelpCircle className="size-4 text-muted-foreground"/>
                                                </FormLabel>
                                            </TooltipTrigger>
                                            <TooltipContent
                                                className="z-[999] w-[400px]"
                                                align="start"
                                                side="top"
                                            >
												<span>
													通用节点：可做任何用途，无SLA及数据保障<br/>
													建站节点：仅允许web应用、数据库，提供SLA及数据保障
												</span>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择一个服务集群"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {servers?.map((server) => (
                                                    <SelectItem
                                                        key={server.serverId}
                                                        value={server.serverId}
                                                    >
                                                        <span
                                                            className="flex items-center gap-2 justify-between w-full">
                                                            {server.type === '1' ?
                                                                <span
                                                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                                  建站
                                                                </span> :
                                                                <span
                                                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                                                  通用
                                                                </span>
                                                            }
                                                            <span>{server.name}</span>
															<span className="text-muted-foreground text-xs self-center" style={{maxWidth:'60%'}}>
																{server.description}
															</span>
                                                            <span>
                                                                {(server.resourceUsed/server.resourceLimit) < 0.6 ? (
                                                                    <span
                                                                        className="inline-flex items-center px-2 py-1 text-sm font-medium bg-green-800 text-white">
                                                                      正常
                                                                    </span>
                                                                ):''}
                                                                {(server.resourceUsed/server.resourceLimit) >= 0.6 && (server.resourceUsed/server.resourceLimit) < 1 ? (
                                                                    <span
                                                                        className="inline-flex items-center px-2 py-1 text-sm font-medium bg-orange-400 text-white">
                                                                      拥挤
                                                                    </span>
                                                                ):''}
                                                                {(server.resourceUsed/server.resourceLimit) >= 1 ? (
                                                                    <span
                                                                        className="inline-flex items-center px-2 py-1 text-sm font-medium bg-red-800 text-white">
                                                                      满载
                                                                    </span>
                                                                ):''}
                                                            </span>
														</span>
                                                    </SelectItem>
                                                ))}
                                                <SelectLabel>可用服务集群 ({servers?.length})</SelectLabel>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        {showTip && <AlertBlock
                            type="warning">建站型节点不允许部署代理等持续高带宽占用应用，违者封禁账户且不退款</AlertBlock>}
                        <FormField
                            control={form.control}
                            name="stand"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>资源规格</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={'0'}
                                            value={field.value}
                                            className="grid w-full grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4"
                                        >
                                            {standList?.map((value) => (
                                                <FormItem
                                                    key={value.id}
                                                    className="flex w-full items-center space-x-3 space-y-0"
                                                >
                                                    <FormControl className="w-full">
                                                        <div>
                                                            <RadioGroupItem
                                                                value={value.id}
                                                                id={value.id}
                                                                className="peer sr-only"
                                                            />
                                                            <Label
                                                                htmlFor={value.id}
                                                                className="flex flex-col gap-2 items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                                            >
                                                                <div style={{fontSize: '12px'}}>{value.cpulabel}</div>
                                                                <div style={{fontSize: '12px'}}>{value.memlabel}</div>
                                                            </Label>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="appName"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>实例名称</FormLabel>
                                    <FormControl>
                                        <Input placeholder="my-app" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>描述</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="服务描述..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>

                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                    </form>

                    <DialogFooter>
                        <div className="gradient-text"
                             style={{width: 'calc(100% - 72px)', fontSize: '13px', fontWeight: '700'}}>
                            价格：
                            {getPrice()} 元/小时
                            约 {(getPrice() * 720).toFixed(2)}元/月
                        </div>
                        <Button isLoading={isLoading} form="hook-form" type="submit">
                            创建
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
