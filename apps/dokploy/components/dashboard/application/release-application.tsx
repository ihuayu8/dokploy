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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {api} from "@/utils/api";
import {zodResolver} from "@hookform/resolvers/zod";
import {CheckIcon, ChevronsUpDown, HelpCircle, Save} from "lucide-react";
import {useEffect, useState} from "react";
import {useForm} from "react-hook-form";
import {toast} from "sonner";
import {z} from "zod";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {cn} from "@/lib/utils";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem} from "@/components/ui/command";
import {ScrollArea} from "@/components/ui/scroll-area";

const ReleaseApplicationSchema = z.object({
    appShopId: z.string().optional(),
    addType: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    github: z.string().optional(),
    website: z.string().optional(),
    docs: z.string().optional(),
    instruction: z.string().optional(),
    logo: z.string().optional(),
    tags: z.array(z.string()).optional(),
    versionNum: z.string().min(1, {
        message: "请输入版本号",
    })
}).refine(
    (data) => data.addType !== "addNew" || (data.name && data.name.trim() !== ''),
    {
        message: '名称不能为空',
        path: ['name'] // 指定错误关联到value字段
    });

type ReleaseApplication = z.infer<typeof ReleaseApplicationSchema>;

interface Props {
    applicationId: string;
}

export const ReleaseApplication = ({applicationId}: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    const utils = api.useUtils();
    const {mutateAsync, error, isError, isLoading} =
        api.applicationShop.createTemplate.useMutation();

    const {data:tags,  isLoading: isLoadingTags} =
        api.applicationShop.allTags.useQuery();

    useEffect(() => {
        console.log(tags)
    }, [tags]);

    const {data: myApps} = api.applicationShop.getMyApps.useQuery(
        null,
        {
            enabled: !!applicationId,
        },
    );

    const form = useForm<ReleaseApplication>({
        defaultValues: {
            addType: "addNew",
            appShopId: "",
            name: "",
            description: "",
            github: "",
            website: "",
            docs: "",
            instruction: "",
            logo: "",
            tags: [],
            versionNum: "",

        },
        resolver: zodResolver(ReleaseApplicationSchema),
    });

    const handlerTabChange = (value) => {
        form.setValue("addType", value)
    }


    const onSubmit = async (formData: ReleaseApplication) => {
        await mutateAsync({
            ...formData,
            applicationId: applicationId
        })
            .then(() => {
                toast.success("添加成功");
                utils.application.one.invalidate({
                    applicationId: applicationId,
                });
                setIsOpen(false);
            })
            .catch((err) => {
                toast.error(err.shape.message || "创建模板出错");
            })
            .finally(() => {
            });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="group hover:bg-blue-500/10 "
                >
                    <Save className="size-3.5  text-primary group-hover:text-blue-500"/>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-screen overflow-y-auto sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>保存为模板</DialogTitle>
                    <DialogDescription>将应用保存为模板以重复构建或发布</DialogDescription>
                </DialogHeader>
                {isError && <AlertBlock type="error">{error?.message}</AlertBlock>}

                <div className="grid gap-4">
                    <div className="grid items-center gap-4">
                        <Tabs defaultValue="addNew" onValueChange={handlerTabChange}>
                            <TabsList>
                                <TabsTrigger value="addNew">添加新应用模板</TabsTrigger>
                                <TabsTrigger value="addToVersion">添加到已有模板的新版本</TabsTrigger>
                            </TabsList>
                            <TabsContent value="addNew" className="pt-4 overflow-hidden">
                                <Form {...form}>
                                    <form
                                        onSubmit={form.handleSubmit(onSubmit)}
                                        id="hook-form-release"
                                        className="grid grid-cols-1 md:grid-cols-2 w-full gap-4 "
                                    >
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel>模板名称</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="例如：mysql" {...field} />
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
                                                    <FormLabel>简介</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="简介明了，例如：一款网盘聚合程序"
                                                            {...field}
                                                        />
                                                    </FormControl>

                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="tags"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel>标签</FormLabel>
                                                    <FormControl>
                                                        <Popover modal={true}>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "w-full sm:w-[200px] justify-between !bg-input",
                                                                    )}
                                                                >
                                                                    {isLoadingTags
                                                                        ? "加载中...."
                                                                        : field.value.length > 0
                                                                            ? `选择了 ${field.value.length} 个标签`
                                                                            : "选择标签"}

                                                                    <ChevronsUpDown
                                                                        className="ml-2 h-4 w-4 opacity-50"/>
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="p-0" align="start">
                                                                <Command>
                                                                    <CommandInput
                                                                        placeholder="搜索标签..."
                                                                        className="h-9"
                                                                    />
                                                                    {isLoadingTags && (
                                                                        <span className="py-6 text-center text-sm">
                                                                            加载标签中....
                                                                        </span>
                                                                    )}
                                                                    <CommandEmpty>没有找到标签</CommandEmpty>
                                                                    <ScrollArea className="h-96">
                                                                        <CommandGroup>
                                                                            {tags?.map((tag) => (
                                                                                <CommandItem
                                                                                    value={tag.value}
                                                                                    key={tag.value}
                                                                                    onSelect={() => {
                                                                                        if (field.value.includes(tag.value)) {
                                                                                            form.setValue("tags",
                                                                                                field.value.filter((t) => t !== tag.value),
                                                                                            );
                                                                                            return;
                                                                                        }
                                                                                        form.setValue("tags" ,[...field.value, tag.value]);
                                                                                    }}
                                                                                >
                                                                                    {tag.value}
                                                                                    <CheckIcon
                                                                                        className={cn(
                                                                                            "ml-auto h-4 w-4",
                                                                                            field.value.includes(tag.value)
                                                                                                ? "opacity-100"
                                                                                                : "opacity-0",
                                                                                        )}
                                                                                    />
                                                                                </CommandItem>
                                                                            ))}
                                                                        </CommandGroup>
                                                                    </ScrollArea>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </FormControl>

                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="github"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel>GitHub链接</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="请填写该应用的github链接(选填)" {...field} />
                                                    </FormControl>

                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="website"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel>官网链接</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="请填写该应用的官网链接(选填)" {...field} />
                                                    </FormControl>

                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="docs"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel>文档链接</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="请填写该应用的文档链接(选填)" {...field} />
                                                    </FormControl>

                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="versionNum"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel>版本号</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="请填写此次发布的版本号，建议与镜像/程序的版本号保持一致" {...field} />
                                                    </FormControl>

                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                    </form>
                                    <form
                                        onSubmit={form.handleSubmit(onSubmit)}
                                        id="hook-form-release"
                                        className="grid grid-cols-1 w-full gap-4 "
                                    >
                                        <FormField
                                            control={form.control}
                                            name="instruction"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel>使用介绍</FormLabel>
                                                    <FormControl>
                                                        <Textarea className="resize-none"
                                                                  placeholder="请填写该应用模板的详细使用介绍(选填)" {...field} />
                                                    </FormControl>

                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                        <DialogFooter>
                                            <Button
                                                isLoading={isLoading}
                                                form="hook-form-release"
                                                type="submit"
                                            >
                                                保存
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </TabsContent>
                            <TabsContent value="addToVersion" className="pt-4 overflow-hidden">
                                <Form {...form}>
                                    <form
                                        onSubmit={form.handleSubmit(onSubmit)}
                                        id="hook-form-release"
                                        className="grid grid-cols-1 w-full gap-4 "
                                    >
                                        <FormField
                                            control={form.control}
                                            name="appShopId"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel
                                                        className="break-all w-fit flex flex-row gap-1 items-center">
                                                        选择一个应用模板
                                                    </FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="选择一个应用模板"/>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectGroup>
                                                                {myApps?.map((app) => (
                                                                    <SelectItem
                                                                        key={app.appShopId}
                                                                        value={app.appShopId.toString()}
                                                                    >
                                                        <span
                                                            className="flex items-center gap-2 justify-between w-full">
                                                            {app.status === '1' ?
                                                                <span
                                                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                                  已上架
                                                                </span> :
                                                                <span
                                                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                                                  未上架
                                                                </span>
                                                            }
                                                            <span>{app.name}</span>
                                							<span className="text-muted-foreground text-xs self-center">
                                								{app.description}
                                							</span>
                                						</span>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="versionNum"
                                            render={({field}) => (
                                                <FormItem>
                                                    <FormLabel>版本号</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="请填写此次发布的版本号，建议与镜像/程序的版本号保持一致" {...field} />
                                                    </FormControl>

                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                        <DialogFooter>
                                            <Button
                                                isLoading={isLoading}
                                                form="hook-form-release"
                                                type="submit"
                                            >
                                                保存
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
