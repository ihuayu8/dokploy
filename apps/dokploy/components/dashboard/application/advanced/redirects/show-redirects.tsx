import { DialogAction } from "@/components/shared/dialog-action";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/utils/api";
import { Split, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HandleRedirect } from "./handle-redirect";

interface Props {
	applicationId: string;
}

export const ShowRedirects = ({ applicationId }: Props) => {
	const { data, refetch } = api.application.one.useQuery(
		{
			applicationId,
		},
		{ enabled: !!applicationId },
	);

	const { mutateAsync: deleteRedirect, isLoading: isRemoving } =
		api.redirects.delete.useMutation();

	const utils = api.useUtils();

	return (
		<Card className="bg-background">
			<CardHeader className="flex flex-row justify-between flex-wrap gap-4">
				<div>
					<CardTitle className="text-xl">重定向</CardTitle>
					<CardDescription>
						如果您想将请求重定向到此应用程序，请使用以下配置来设置重定向
					</CardDescription>
				</div>

				{data && data?.redirects.length > 0 && (
					<HandleRedirect applicationId={applicationId}>
						添加重定向
					</HandleRedirect>
				)}
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{data?.redirects.length === 0 ? (
					<div className="flex w-full flex-col items-center justify-center gap-3 pt-10">
						<Split className="size-8 text-muted-foreground" />
						<span className="text-base text-muted-foreground">
							没有重定向设置
						</span>
						<HandleRedirect applicationId={applicationId}>
							添加重定向
						</HandleRedirect>
					</div>
				) : (
					<div className="flex flex-col pt-2">
						<div className="flex flex-col gap-6">
							{data?.redirects.map((redirect) => (
								<div key={redirect.redirectId}>
									<div className="flex w-full flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-10 border rounded-lg p-4">
										<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 flex-col gap-4 sm:gap-8">
											<div className="flex flex-col gap-1">
												<span className="font-medium">正则</span>
												<span className="text-sm text-muted-foreground">
													{redirect.regex}
												</span>
											</div>
											<div className="flex flex-col gap-1">
												<span className="font-medium">重写</span>
												<span className="text-sm text-muted-foreground">
													{redirect.replacement}
												</span>
											</div>
											<div className="flex flex-col gap-1">
												<span className="font-medium">永久</span>
												<span className="text-sm text-muted-foreground">
													{redirect.permanent ? "Yes" : "No"}
												</span>
											</div>
										</div>
										<div className="flex flex-row gap-4">
											<HandleRedirect
												redirectId={redirect.redirectId}
												applicationId={applicationId}
											/>

											<DialogAction
												title="删除重定向"
												description="确认删除此重定向吗?"
												type="destructive"
												onClick={async () => {
													await deleteRedirect({
														redirectId: redirect.redirectId,
													})
														.then(() => {
															refetch();
															utils.application.readTraefikConfig.invalidate({
																applicationId,
															});
															toast.success("删除成功");
														})
														.catch(() => {
															toast.error("系统异常");
														});
												}}
											>
												<Button
													variant="ghost"
													size="icon"
													className="group hover:bg-red-500/10"
													isLoading={isRemoving}
												>
													<Trash2 className="size-4 text-primary group-hover:text-red-500" />
												</Button>
											</DialogAction>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
};
