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
import {useState} from "react";
import {useForm} from "react-hook-form";
import {toast} from "sonner";
import {z} from "zod";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Label} from "@/components/ui/label";
import {standardsMap} from "@/types/standard";

const AddTemplateSchema = z.object({
    name: z.string().min(1, {
        message: "Name is required",
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
    stand: z.string().optional()
});

type AddTemplate = z.infer<typeof AddTemplateSchema>;

interface Props {
    projectId: string;
    projectName?: string;
}

export const AddApplication = ({projectId, projectName}: Props) => {
    const utils = api.useUtils();
    const {data: isCloud} = api.settings.isCloud.useQuery();
    const [visible, setVisible] = useState(false);
    const slug = slugify(projectName);
    const {data: servers} = api.server.withSSHKey.useQuery();

    const {mutateAsync, isLoading, error, isError} =
        api.application.create.useMutation();

    const form = useForm<AddTemplate>({
        defaultValues: {
            name: "",
            appName: `${slug}-`,
            description: "",
            stand: "0"
        },
        resolver: zodResolver(AddTemplateSchema),
    });

    const onSubmit = async (data: AddTemplate) => {
        await mutateAsync({
            name: data.name,
            appName: data.appName,
            description: data.description,
            projectId,
            serverId: data.serverId,
            stand: data.stand
        })
            .then(async () => {
                toast.success("服务创建成功");
                form.reset();
                setVisible(false);
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
            <DialogTrigger className="w-full">
                <DropdownMenuItem
                    className="w-full cursor-pointer space-x-3"
                    onSelect={(e) => e.preventDefault()}
                >
                    <Folder className="size-4 text-muted-foreground"/>
                    <span>应用</span>
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="max-h-screen  overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>创建</DialogTitle>
                    <DialogDescription>
                        为你的应用程序分配一个名称和描述
                    </DialogDescription>
                </DialogHeader>
                {isError && <AlertBlock type="error">{error?.message}</AlertBlock>}
                <Form {...form}>
                    <form
                        id="hook-form"
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="grid w-full gap-4"
                    >
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
                            name="stand"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>资源规格</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={'0'}
                                            className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
                                        >
                                            {Object.entries(standardsMap).map(([key, value]) => (
                                                <FormItem
                                                    key={key}
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
                                                                <div style={{fontSize:'12px'}}>{value.cpuLimit}</div>
                                                                <div style={{fontSize:'12px'}}>{value.memLimit}</div>
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
                            name="serverId"
                            render={({field}) => (
                                <FormItem>
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <FormLabel className="break-all w-fit flex flex-row gap-1 items-center">
                                                    选择一个服务器 {!isCloud ? "(可选)" : ""}
                                                    <HelpCircle className="size-4 text-muted-foreground"/>
                                                </FormLabel>
                                            </TooltipTrigger>
                                            <TooltipContent
                                                className="z-[999] w-[300px]"
                                                align="start"
                                                side="top"
                                            >
												<span>
													如果未选择服务器，应用程序将部署在用户登录的服务器上
												</span>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择一个服务器"/>
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
															<span>{server.name}</span>
															<span className="text-muted-foreground text-xs self-center">
																{server.ipAddress}
															</span>
														</span>
                                                    </SelectItem>
                                                ))}
                                                <SelectLabel>Servers ({servers?.length})</SelectLabel>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
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
                        <div className="gradient-text" style={{width: 'calc(100% - 72px)', fontSize: '13px', fontWeight: '700'}}>
                            价格： {standardsMap[form.watch().stand].price}元/小时 约 {(standardsMap[form.watch().stand].price * 720).toFixed(2)}元/月
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
