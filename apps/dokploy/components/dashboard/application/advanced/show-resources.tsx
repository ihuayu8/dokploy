import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { standardsMap } from "@/types/standard";
import { api } from "@/utils/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const addResourcesSchema = z.object({
	memoryReservation: z.string().optional(),
	cpuLimit: z.string().optional(),
	memoryLimit: z.string().optional(),
	cpuReservation: z.string().optional(),
	stand: z.string().optional()
});

export type ServiceType =
	| "postgres"
	| "mongo"
	| "redis"
	| "mysql"
	| "mariadb"
	| "application";

interface Props {
	id: string;
	type: ServiceType | "application";
	serverId: string;
}

type AddResources = z.infer<typeof addResourcesSchema>;
export const ShowResources = ({ id, type, serverId }: Props) => {
	const {data: standList} = api.server.getServerStands.useQuery(
		{
			serverId: serverId || "-"
		},
		{enabled: true}
	);
	const {data: serverInfo} = api.server.getServerInfo.useQuery(
		{
			serverId: serverId|| "-"
		},
		{enabled: true}
	);

	const [price, setPrice] = useState<number>(0)


	const getPrice = () => {
		const price = standList?.find(item=>item.id === (form.watch().stand))?.price;
		let rate = serverInfo?.rate;
		return parseFloat((parseFloat(price) * parseFloat(rate)).toFixed(4));
	}
	const queryMap = {
		postgres: () =>
			api.postgres.one.useQuery({ postgresId: id }, { enabled: !!id }),
		redis: () => api.redis.one.useQuery({ redisId: id }, { enabled: !!id }),
		mysql: () => api.mysql.one.useQuery({ mysqlId: id }, { enabled: !!id }),
		mariadb: () =>
			api.mariadb.one.useQuery({ mariadbId: id }, { enabled: !!id }),
		application: () =>
			api.application.one.useQuery({ applicationId: id }, { enabled: !!id }),
		mongo: () => api.mongo.one.useQuery({ mongoId: id }, { enabled: !!id }),
	};
	const { data, refetch } = queryMap[type]
		? queryMap[type]()
		: api.mongo.one.useQuery({ mongoId: id }, { enabled: !!id });

	const mutationMap = {
		postgres: () => api.postgres.update.useMutation(),
		redis: () => api.redis.update.useMutation(),
		mysql: () => api.mysql.update.useMutation(),
		mariadb: () => api.mariadb.update.useMutation(),
		application: () => api.application.update.useMutation(),
		mongo: () => api.mongo.update.useMutation(),
	};

	const { mutateAsync, isLoading } = mutationMap[type]
		? mutationMap[type]()
		: api.mongo.update.useMutation();

	const form = useForm<AddResources>({
		defaultValues: {
			cpuLimit: "",
			cpuReservation: "",
			memoryLimit: "",
			memoryReservation: "",
      		stand: "0"
		},
		resolver: zodResolver(addResourcesSchema),
	})

	useEffect(() => {
		setPrice(getPrice())
	}, [standList, serverInfo, form.watch().stand]);

	useEffect(() => {
		if (data) {
			form.reset({
				cpuLimit: data?.cpuLimit || undefined,
				cpuReservation: data?.cpuReservation || undefined,
				memoryLimit: data?.memoryLimit || undefined,
				memoryReservation: data?.memoryReservation || undefined,
				stand: data?.stand || undefined
			});
		}
	}, [data, form, form.reset]);

	const onSubmit = async (formData: AddResources) => {
		await mutateAsync({
			mongoId: id || "",
			postgresId: id || "",
			redisId: id || "",
			mysqlId: id || "",
			mariadbId: id || "",
			applicationId: id || "",
			cpuLimit: formData.cpuLimit || null,
			cpuReservation: formData.cpuReservation || null,
			memoryLimit: formData.memoryLimit || null,
			memoryReservation: formData.memoryReservation || null,
			stand: formData.stand || null,
		})
			.then(async () => {
				toast.success("更新容器规格成功,请重新部署以应用更改！");
				await refetch();
			})
			.catch(() => {
				toast.error("Error updating the resources");
			});
	};

	return (
		<Card className="bg-background">
			<CardHeader>
				<CardTitle className="text-xl">规格</CardTitle>
				<CardDescription>
					动态调整应用容器规格，可滚动部署实现优雅更新
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<AlertBlock type="info">
					修改容器规格后，需要点击[部署]按钮重新部署以生效
				</AlertBlock>
				<Form {...form}>
					<form
						id="hook-form"
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid w-full gap-8 "
					>
						
							<FormField
								control={form.control}
                				defaultValue={form.control._defaultValues.stand}
								name="stand"
								render={({ field }) => (
									<FormItem>
										<FormLabel>资源规格</FormLabel>
										<FormControl>
											<RadioGroup
												onValueChange={field.onChange}
												defaultValue={field.value}
												value={field.value}
												className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-8 gap-4"
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
																	<div style={{ fontSize: '12px' }}>{value.cpulabel}</div>
																	<div style={{ fontSize: '12px' }}>{value.memlabel}</div>
																</Label>
															</div>
														</FormControl>
													</FormItem>
												))}
											</RadioGroup>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						<div className="flex w-full justify-end">
							<div className="gradient-text" style={{width: 'calc(100% - 72px)', fontSize: '13px', fontWeight: '700'}}>
								价格： {price}元/小时 约 {(price * 720).toFixed(2)}元/月
							</div>
							<Button isLoading={isLoading} type="submit">
								保存
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
