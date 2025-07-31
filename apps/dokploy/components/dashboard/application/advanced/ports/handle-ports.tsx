import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/utils/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { PenBoxIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const AddPortSchema = z.object({
	publishedPort: z.number().int(),
	publishMode: z.enum(["ingress", "host"], {
		required_error: "Publish mode is required",
	}),
	targetPort: z.number().int().min(1).max(65535),
	protocol: z.enum(["tcp", "udp"], {
		required_error: "Protocol is required",
	}),
});

type AddPort = z.infer<typeof AddPortSchema>;

interface Props {
	applicationId: string;
	portId?: string;
	children?: React.ReactNode;
}

export const HandlePorts = ({
	applicationId,
	portId,
	children = <PlusIcon className="h-4 w-4" />,
}: Props) => {
	const [isOpen, setIsOpen] = useState(false);
	const utils = api.useUtils();

	const { data } = api.port.one.useQuery(
		{
			portId: portId ?? "",
		},
		{
			enabled: !!portId,
		},
	);
	const { mutateAsync, isLoading, error, isError } = portId
		? api.port.update.useMutation()
		: api.port.create.useMutation();

	const form = useForm<AddPort>({
		defaultValues: {
			publishedPort: 0,
			targetPort: 0,
		},
		resolver: zodResolver(AddPortSchema),
	});

	useEffect(() => {
		form.reset({
			publishedPort: data?.publishedPort ?? 0,
			publishMode: data?.publishMode ?? "ingress",
			targetPort: data?.targetPort ?? 0,
			protocol: data?.protocol ?? "tcp",
		});
	}, [form, form.reset, form.formState.isSubmitSuccessful, data]);

	const onSubmit = async (data: AddPort) => {
		await mutateAsync({
			applicationId,
			...data,
			portId: portId || "",
		})
			.then(async () => {
				toast.success(portId ? "端口更新成功" : "端口创建成功");
				await utils.application.one.invalidate({
					applicationId,
				});
				setIsOpen(false);
			})
			.catch(() => {
				toast.error(
					portId ? "更新失败" : "创建失败",
				);
			});
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				{portId ? (
					<Button
						variant="ghost"
						size="icon"
						className="group hover:bg-blue-500/10 "
					>
						<PenBoxIcon className="size-3.5  text-primary group-hover:text-blue-500" />
					</Button>
				) : (
					<Button>{children}</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-h-screen  overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>端口</DialogTitle>
					<DialogDescription>
						开放端口允许你将应用程序暴露在互联网上
					</DialogDescription>
				</DialogHeader>
				{isError && <AlertBlock type="error">{error?.message}</AlertBlock>}

				<Form {...form}>
					<form
						id="hook-form-add-port"
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid w-full gap-4"
					>
						<div className="flex flex-col gap-4">
							<FormField
								control={form.control}
								name="targetPort"
								render={({ field }) => (
									<FormItem>
										<FormLabel>目标端口</FormLabel>
										<FormControl>
											<Input
												placeholder="1-65535"
												{...field}
												value={field.value?.toString() || ""}
												onChange={(e) => {
													const value = e.target.value;
													if (value === "") {
														field.onChange(0);
													} else {
														const number = Number.parseInt(value, 10);
														if (!Number.isNaN(number)) {
															field.onChange(number);
														}
													}
												}}
											/>
										</FormControl>

										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="protocol"
								render={({ field }) => {
									return (
										<FormItem className="md:col-span-2">
											<FormLabel>协议</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select a protocol" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value={"tcp"}>TCP</SelectItem>
													<SelectItem value={"udp"}>UDP</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
						</div>
					</form>

					<DialogFooter>
						<Button
							isLoading={isLoading}
							form="hook-form-add-port"
							type="submit"
						>
							{portId ? "更新" : "创建"}
						</Button>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	);
};
