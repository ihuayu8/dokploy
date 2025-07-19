import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/utils/api";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
export const DockerLogs = dynamic(
	() =>
		import("@/components/dashboard/docker/logs/docker-logs-id").then(
			(e) => e.DockerLogsId,
		),
	{
		ssr: false,
	},
);

export const badgeStateColor = (state: string) => {
	switch (state) {
		case "running":
			return "green";
		case "exited":
		case "shutdown":
			return "red";
		case "accepted":
		case "created":
			return "blue";
		default:
			return "default";
	}
};

interface Props {
	appName: string;
	serverId?: string;
}

export const ShowDockerLogs = ({ appName, serverId }: Props) => {
	const [containerId, setContainerId] = useState<string | undefined>();
	const [option, setOption] = useState<"swarm" | "native">("swarm");

	const { data: services, isLoading: servicesLoading } =
		api.docker.getServiceContainersByAppName.useQuery(
			{
				appName,
				serverId,
			},
			{
				enabled: !!appName && option === "swarm",
			},
		);

	const { data: containers, isLoading: containersLoading } =
		api.docker.getContainersByAppNameMatch.useQuery(
			{
				appName,
				serverId,
			},
			{
				enabled: !!appName && option === "native",
			},
		);

	useEffect(() => {
		if (option === "native") {
			if (containers && containers?.length > 0) {
				setContainerId(containers[0]?.containerId);
			}
		} else {
			if (services && services?.length > 0) {
				setContainerId(services[0]?.containerId);
			}
		}
	}, [option, services, containers]);

	const isLoading = option === "native" ? containersLoading : servicesLoading;
	const containersLenght =
		option === "native" ? containers?.length : services?.length;

	return (
		<Card className="bg-background">
			<CardHeader>
				<CardTitle className="text-xl">日志</CardTitle>
				<CardDescription>
					查看应用的实时日志
				</CardDescription>
			</CardHeader>

			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-row justify-between items-center gap-2">
					<Label>选择一个容器以查看日志</Label>
					<div className="flex flex-row gap-2 items-center">
						<span className="text-sm text-muted-foreground">
							{option === "native" ? "Native" : "Swarm"}
						</span>
						<Switch
							checked={option === "native"}
							onCheckedChange={(checked) => {
								setOption(checked ? "native" : "swarm");
							}}
						/>
					</div>
				</div>

				<Select onValueChange={setContainerId} value={containerId}>
					<SelectTrigger>
						{isLoading ? (
							<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground">
								<span>Loading...</span>
								<Loader2 className="animate-spin size-4" />
							</div>
						) : (
							<SelectValue placeholder="选择一个容器" />
						)}
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{option === "native" ? (
								<div>
									{containers?.map((container) => (
										<SelectItem
											key={container.containerId}
											value={container.containerId}
										>
											{container.name} ({container.containerId}){" "}
											<Badge variant={badgeStateColor(container.state)}>
												{container.state}
											</Badge>
										</SelectItem>
									))}
								</div>
							) : (
								<>
									{services?.map((container) => (
										<SelectItem
											key={container.containerId}
											value={container.containerId}
										>
											{container.name} ({container.containerId}@{container.node}
											)
											<Badge variant={badgeStateColor(container.state)}>
												{container.state}
											</Badge>
										</SelectItem>
									))}
								</>
							)}

							<SelectLabel>Containers ({containersLenght})</SelectLabel>
						</SelectGroup>
					</SelectContent>
				</Select>
				<DockerLogs
					serverId={serverId || ""}
					containerId={containerId || "select-a-container"}
					runType={option}
				/>
			</CardContent>
		</Card>
	);
};
