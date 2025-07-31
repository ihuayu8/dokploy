import { ShowBuildChooseForm } from "@/components/dashboard/application/build/show";
import { ShowProviderForm } from "@/components/dashboard/application/general/generic/show";
import { DialogAction } from "@/components/shared/dialog-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/utils/api";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
	Ban,
	CheckCircle2,
	Hammer,
	RefreshCcw,
	Rocket,
	Terminal,
} from "lucide-react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { DockerTerminalModal } from "../../settings/web-server/docker-terminal-modal";
import {TRPCClientError} from "@trpc/client";
interface Props {
	applicationId: string;
}

export const ShowGeneralApplication = ({ applicationId }: Props) => {
	const router = useRouter();
	const { data, refetch } = api.application.one.useQuery(
		{
			applicationId,
		},
		{ enabled: !!applicationId },
	);
	const { mutateAsync: update } = api.application.update.useMutation();
	const { mutateAsync: start, isLoading: isStarting } =
		api.application.start.useMutation();
	const { mutateAsync: stop, isLoading: isStopping } =
		api.application.stop.useMutation();

	const { mutateAsync: deploy } = api.application.deploy.useMutation();

	const { mutateAsync: reload, isLoading: isReloading } =
		api.application.reload.useMutation();

	const { mutateAsync: redeploy } = api.application.redeploy.useMutation();

	return (
		<>
			<Card className="bg-background">
				<CardHeader>
					<CardTitle className="text-xl">部署配置</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-row gap-4 flex-wrap">
					<TooltipProvider delayDuration={0} disableHoverableContent={false}>
						<DialogAction
							title="部署应用"
							description="确认要部署此应用吗?"
							type="default"
							onClick={async () => {
								await deploy({
									applicationId: applicationId,
								})
									.then(() => {
										toast.success("应用已开始进行部署！");
										refetch();
										router.push(
											`/dashboard/project/${data?.projectId}/services/application/${applicationId}?tab=deployments`,
										);
									})
									.catch((err) => {
										toast.error(err.shape.message);
									});
							}}
						>
							<Button
								variant="default"
								isLoading={data?.applicationStatus === "running"}
								className="flex items-center gap-1.5 group focus-visible:ring-2 focus-visible:ring-offset-2"
							>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center">
											<Rocket className="size-4 mr-1" />
											部署
										</div>
									</TooltipTrigger>
									<TooltipPrimitive.Portal>
										<TooltipContent sideOffset={5} className="z-[60]">
											<p>
												下载源代码并执行完整构建
											</p>
										</TooltipContent>
									</TooltipPrimitive.Portal>
								</Tooltip>
							</Button>
						</DialogAction>
						{/*<DialogAction*/}
						{/*	title="Reload Application"*/}
						{/*	description="Are you sure you want to reload this application?"*/}
						{/*	type="default"*/}
						{/*	onClick={async () => {*/}
						{/*		await reload({*/}
						{/*			applicationId: applicationId,*/}
						{/*			appName: data?.appName || "",*/}
						{/*		})*/}
						{/*			.then(() => {*/}
						{/*				toast.success("应用重载成功");*/}
						{/*				refetch();*/}
						{/*			})*/}
						{/*			.catch((e) => {*/}
						{/*				toast.error(e.shape.message);*/}
						{/*			});*/}
						{/*	}}*/}
						{/*>*/}
						{/*	<Button*/}
						{/*		variant="secondary"*/}
						{/*		isLoading={isReloading}*/}
						{/*		className="flex items-center gap-1.5 group focus-visible:ring-2 focus-visible:ring-offset-2"*/}
						{/*	>*/}
						{/*		<Tooltip>*/}
						{/*			<TooltipTrigger asChild>*/}
						{/*				<div className="flex items-center">*/}
						{/*					<RefreshCcw className="size-4 mr-1" />*/}
						{/*					重载*/}
						{/*				</div>*/}
						{/*			</TooltipTrigger>*/}
						{/*			<TooltipPrimitive.Portal>*/}
						{/*				<TooltipContent sideOffset={5} className="z-[60]">*/}
						{/*					<p>重载应用但不进行重新构建</p>*/}
						{/*				</TooltipContent>*/}
						{/*			</TooltipPrimitive.Portal>*/}
						{/*		</Tooltip>*/}
						{/*	</Button>*/}
						{/*</DialogAction>*/}
						{/*<DialogAction*/}
						{/*	title="Rebuild Application"*/}
						{/*	description="Are you sure you want to rebuild this application?"*/}
						{/*	type="default"*/}
						{/*	onClick={async () => {*/}
						{/*		await redeploy({*/}
						{/*			applicationId: applicationId,*/}
						{/*		})*/}
						{/*			.then(() => {*/}
						{/*				toast.success("应用重新构建成功");*/}
						{/*				refetch();*/}
						{/*			})*/}
						{/*			.catch((e) => {*/}
						{/*				toast.error(e.shape.message);*/}
						{/*			});*/}
						{/*	}}*/}
						{/*>*/}
						{/*	<Button*/}
						{/*		variant="secondary"*/}
						{/*		isLoading={data?.applicationStatus === "running"}*/}
						{/*		className="flex items-center gap-1.5 group focus-visible:ring-2 focus-visible:ring-offset-2"*/}
						{/*	>*/}
						{/*		<Tooltip>*/}
						{/*			<TooltipTrigger asChild>*/}
						{/*				<div className="flex items-center">*/}
						{/*					<Hammer className="size-4 mr-1" />*/}
						{/*					重新构建*/}
						{/*				</div>*/}
						{/*			</TooltipTrigger>*/}
						{/*			<TooltipPrimitive.Portal>*/}
						{/*				<TooltipContent sideOffset={5} className="z-[60]">*/}
						{/*					<p>*/}
						{/*						重新构建但不下载最新的源代码*/}
						{/*					</p>*/}
						{/*				</TooltipContent>*/}
						{/*			</TooltipPrimitive.Portal>*/}
						{/*		</Tooltip>*/}
						{/*	</Button>*/}
						{/*</DialogAction>*/}

						{data?.applicationStatus === "idle" ? (
							<DialogAction
								title="启动应用"
								description="确认启动此应用吗?"
								type="default"
								onClick={async () => {
									await start({
										applicationId: applicationId,
									})
										.then(() => {
											toast.success("应用启动成功");
											refetch();
										})
										.catch((e) => {
											toast.error(e.shape.message);
										});
								}}
							>
								<Button
									variant="secondary"
									isLoading={isStarting}
									className="flex items-center gap-1.5 group focus-visible:ring-2 focus-visible:ring-offset-2"
								>
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex items-center">
												<CheckCircle2 className="size-4 mr-1" />
												启动
											</div>
										</TooltipTrigger>
										<TooltipPrimitive.Portal>
											<TooltipContent sideOffset={5} className="z-[60]">
												<p>
													启动应用 (需要有成功的构建)
												</p>
											</TooltipContent>
										</TooltipPrimitive.Portal>
									</Tooltip>
								</Button>
							</DialogAction>
						) : (
							<DialogAction
								title="停止应用"
								description="确认停止此应用吗?停止后将不再计费，但数据卷也可能会不定时被删除。"
								onClick={async () => {
									await stop({
										applicationId: applicationId,
									})
										.then(() => {
											toast.success("应用停止成功");
											refetch();
										})
										.catch(() => {
											toast.error("Error stopping application");
										});
								}}
							>
								<Button
									variant="destructive"
									isLoading={isStopping}
									className="flex items-center gap-1.5 group focus-visible:ring-2 focus-visible:ring-offset-2"
								>
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex items-center">
												<Ban className="size-4 mr-1" />
												停止
											</div>
										</TooltipTrigger>
										<TooltipPrimitive.Portal>
											<TooltipContent sideOffset={5} className="z-[60]">
												<p>停止当前正在运行的应用</p>
											</TooltipContent>
										</TooltipPrimitive.Portal>
									</Tooltip>
								</Button>
							</DialogAction>
						)}
					</TooltipProvider>
					<DockerTerminalModal
						appName={data?.appName || ""}
						serverId={data?.serverId || ""}
					>
						<Button
							variant="outline"
							className="flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2"
						>
							<Terminal className="size-4 mr-1" />
							打开终端
						</Button>
					</DockerTerminalModal>
					<div className="flex flex-row items-center gap-2 rounded-md px-4 py-2 border">
						<span className="text-sm font-medium">自动部署</span>
						<Switch
							aria-label="Toggle autodeploy"
							checked={data?.autoDeploy || false}
							onCheckedChange={async (enabled) => {
								await update({
									applicationId,
									autoDeploy: enabled,
								})
									.then(async () => {
										toast.success("Auto Deploy Updated");
										await refetch();
									})
									.catch(() => {
										toast.error("Error updating Auto Deploy");
									});
							}}
							className="flex flex-row gap-2 items-center data-[state=checked]:bg-primary"
						/>
					</div>

					<div className="flex flex-row items-center gap-2 rounded-md px-4 py-2 border">
						<span className="text-sm font-medium">清理缓存</span>
						<Switch
							aria-label="Toggle clean cache"
							checked={data?.cleanCache || false}
							onCheckedChange={async (enabled) => {
								await update({
									applicationId,
									cleanCache: enabled,
								})
									.then(async () => {
										toast.success("Clean Cache Updated");
										await refetch();
									})
									.catch(() => {
										toast.error("Error updating Clean Cache");
									});
							}}
							className="flex flex-row gap-2 items-center data-[state=checked]:bg-primary"
						/>
					</div>
				</CardContent>
			</Card>
			<ShowProviderForm applicationId={applicationId} />
			{/*<ShowBuildChooseForm applicationId={applicationId} />*/}
		</>
	);
};
