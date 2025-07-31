import { GithubIcon } from "@/components/icons/data-tools-icons";
import { AlertBlock } from "@/components/shared/alert-block";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";
import {
	BookText,
	CheckIcon,
	ChevronsUpDown,
	Globe,
	HelpCircle,
	LayoutGrid,
	List,
	Loader2,
	PuzzleIcon,
	SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AddApplication } from "@/components/dashboard/project/add-application";

const TEMPLATE_BASE_URL_KEY = "dokploy_template_base_url";

interface Props {
	projectId: string;
	projectName?: string;
}

export const AddShop = ({ projectId, projectName }: Props) => {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [viewMode, setViewMode] = useState<"detailed" | "icon">("detailed");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [visible, setVisible] = useState(false);
	const [order, setOrder] = useState<string>("install-desc");
	const [appShopId, setAppShopId] = useState<string | null>(null);
	const [appShopName, setAppShopName] = useState<string | null>(null);


	const {
		data,
		isLoading: isLoadingTemplates,
		error: errorTemplates,
		isError: isErrorTemplates,
	} = api.applicationShop.allApps.useQuery(
		{ order },
		{
			enabled: open,
		},
	);

	const { data: tags, isLoading: isLoadingTags } = api.applicationShop.allTags.useQuery(
		null,
		{
			enabled: open,
		},
	);

	const handleCreate = (id, name)=>{
		setAppShopId(id)
		setAppShopName(name);
		setVisible(true)
	}

	const templates =
		data?.filter((template) => {
			const matchesTags =
				selectedTags.length === 0 ||
				template.tags?.some((tag) => selectedTags.includes(tag));
			const matchesQuery =
				query === "" ||
				template.name.toLowerCase().includes(query.toLowerCase()) ||
				template.description.toLowerCase().includes(query.toLowerCase());
			return matchesTags && matchesQuery;
		}) || [];

	return (
		<>
			<AddApplication projectId={projectId} projectName={projectName} useTemplate={true} visibleOut={visible}
							setVisibleOut={setVisible} appShopId={appShopId} appShopName={appShopName} setTempVisible={setVisible}></AddApplication>
			<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger className="w-full">
				<DropdownMenuItem
					className="w-full cursor-pointer space-x-3"
					onSelect={(e) => e.preventDefault()}
				>
					<PuzzleIcon className="size-4 text-muted-foreground" />
					<span>应用商店</span>
				</DropdownMenuItem>
			</DialogTrigger>
			<DialogContent className="max-h-screen sm:max-w-[90vw] p-0">
				<DialogHeader className="sticky top-0 z-10 bg-background p-6 border-b">
					<div className="flex flex-col space-y-6">
						<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
							<div>
								<DialogTitle>从应用商店创建</DialogTitle>
								<DialogDescription>
									从应用商店快速创建一个应用
								</DialogDescription>
							</div>
							<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
								<Input
									placeholder="搜索"
									onChange={(e) => setQuery(e.target.value)}
									className="w-full sm:w-[200px]"
									value={query}
								/>
								<Select value={order} onValueChange={setOrder}>
									<SelectTrigger className="lg:w-[280px]">
										<SelectValue placeholder="排序..." />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="install-desc">
											最热门
										</SelectItem>
										<SelectItem value="intime-desc">
											最新
										</SelectItem>
										<SelectItem value="name-asc">
											名称 (A-Z)
										</SelectItem>
										<SelectItem value="name-desc">
											名称 (Z-A)
										</SelectItem>
									</SelectContent>
								</Select>
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
												: selectedTags.length > 0
													? `选择了 ${selectedTags.length} 个标签`
													: "选择标签"}

											<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
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
																if (selectedTags.includes(tag.value)) {
																	setSelectedTags(
																		selectedTags.filter((t) => t !== tag.value),
																	);
																	return;
																}
																setSelectedTags([...selectedTags, tag.value]);
															}}
														>
															{tag.value}
															<CheckIcon
																className={cn(
																	"ml-auto h-4 w-4",
																	selectedTags.includes(tag.value)
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
								<Button
									size="icon"
									onClick={() =>
										setViewMode(viewMode === "detailed" ? "icon" : "detailed")
									}
									className="h-9 w-9"
								>
									{viewMode === "detailed" ? (
										<LayoutGrid className="size-4" />
									) : (
										<List className="size-4" />
									)}
								</Button>
							</div>
						</div>
						{selectedTags.length > 0 && (
							<div className="flex flex-wrap justify-end gap-2">
								{selectedTags.map((tag) => (
									<Badge
										key={tag}
										variant="secondary"
										className="cursor-pointer"
										onClick={() =>
											setSelectedTags(selectedTags.filter((t) => t !== tag))
										}
									>
										{tag} ×
									</Badge>
								))}
							</div>
						)}
					</div>
				</DialogHeader>

				<ScrollArea className="h-[calc(98vh-8rem)]">
					<div className="p-6">
						{isErrorTemplates && (
							<AlertBlock type="error" className="mb-4">
								{errorTemplates?.message}
							</AlertBlock>
						)}

						{isLoadingTemplates ? (
							<div className="flex justify-center items-center w-full h-full flex-row gap-4">
								<Loader2 className="size-8 text-muted-foreground animate-spin min-h-[60vh]" />
								<div className="text-lg font-medium text-muted-foreground">
									Loading templates...
								</div>
							</div>
						) : templates.length === 0 ? (
							<div className="flex justify-center items-center w-full gap-2 min-h-[50vh]">
								<SearchIcon className="text-muted-foreground size-6" />
								<div className="text-xl font-medium text-muted-foreground">
									No templates found
								</div>
							</div>
						) : (
							<div
								className={cn(
									"grid gap-6",
									viewMode === "detailed"
										? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
										: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
								)}
							>
								{templates?.map((template) => (
									<div
										key={template?.appShopId}
										className={cn(
											"flex flex-col border rounded-lg overflow-hidden relative",
											viewMode === "icon" && "h-[200px]",
											viewMode === "detailed" && "h-[400px]",
										)}
									>
										<Badge className="absolute top-2 right-2" variant="blue">
											{template?.versionNum}
										</Badge>
										<div
											className={cn(
												"flex-none p-6 pb-3 flex flex-col items-center gap-4 bg-muted/30",
												viewMode === "detailed" && "border-b",
											)}
										>
											<img
												src={`${template?.logo}`}
												className={cn(
													"object-contain",
													viewMode === "detailed" ? "size-24" : "size-16",
												)}
												alt={template?.name}
											/>
											<div className="flex flex-col items-center gap-2">
												<span className="text-sm font-medium line-clamp-1">
													{template?.name}
												</span>
												{viewMode === "detailed" &&
													template?.tags?.length > 0 && (
														<div className="flex flex-wrap justify-center gap-1.5">
															{template?.tags?.map((tag) => (
																<Badge
																	key={tag}
																	variant="green"
																	className="text-[10px] px-2 py-0"
																>
																	{tag}
																</Badge>
															))}
														</div>
													)}
											</div>
										</div>

										{/* Template Content */}
										{viewMode === "detailed" && (
											<ScrollArea className="flex-1 p-6">
												<div className="text-sm text-muted-foreground">
													{template?.description}
												</div>
											</ScrollArea>
										)}

										{/* Create Button */}
										<div
											className={cn(
												"flex-none px-6 py-3 mt-auto",
												viewMode === "detailed"
													? "flex items-center justify-between bg-muted/30 border-t"
													: "flex justify-center",
											)}
										>
											{viewMode === "detailed" && (
												<div className="flex gap-2">
													{template?.github && (
														<Link
															href={template?.github}
															target="_blank"
															className="text-muted-foreground hover:text-foreground transition-colors"
														>
															<GithubIcon className="size-5" />
														</Link>
													)}
													{template?.website && (
														<Link
															href={template?.website}
															target="_blank"
															className="text-muted-foreground hover:text-foreground transition-colors"
														>
															<Globe className="size-5" />
														</Link>
													)}
													{template?.docs && (
														<Link
															href={template?.docs}
															target="_blank"
															className="text-muted-foreground hover:text-foreground transition-colors"
														>
															<BookText className="size-5" />
														</Link>
													)}
												</div>
											)}
											<Button
												variant="secondary"
												size="sm"
												onClick={()=>handleCreate(template?.appShopId, template?.name)}
												className={cn(
													"w-auto",
													viewMode === "detailed" && "w-auto",
												)}
											>
												创建
											</Button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
		</>
	);
};
