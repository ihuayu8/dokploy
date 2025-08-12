import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/utils/api";
import { Plus } from "lucide-react";
import { type ReactElement, useState } from "react";
import { TicketTable } from "./ticket-table";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
// 新增: 导入对话框组件
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// 新增: 导入表单相关组件
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {toast} from "sonner";

// 新增: 复制create.tsx中的枚举和表单验证模式
enum TicketPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

enum TicketType {
  BUG = "bug",
  FEATURE = "建议",
  QUESTION = "问题",
  OTHER = "其他",
}

const createTicketSchema = z.object({
  title: z.string().min(3, { message: "标题最少3个字符" }),
  description: z
    .string()
    .min(10, { message: "请至少输入10个字符" }),
  type: z.enum(Object.values(TicketType) as [string, ...string[]]),
  priority: z.enum(Object.values(TicketPriority) as [string, ...string[]]),
});

const TicketList = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  // 保持对话框状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const utils = api.useUtils();

  // 新增: 创建工单的表单和API调用
  const form = useForm<z.infer<typeof createTicketSchema>>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      type: TicketType.BUG,
      priority: TicketPriority.MEDIUM,
    },
  });

  const { mutate: createTicket, isLoading } = api.ticket.create.useMutation({
    onSuccess: () => {
      form.reset();
      toast.success('工单创建成功');
      setIsDialogOpen(false);
      // 可以添加刷新工单列表的逻辑
      utils.ticket.all.invalidate().then();
    },
    onError: (error) => {
      console.error("Failed to create ticket:", error);
    },
  });

  const onSubmit = (data: z.infer<typeof createTicketSchema>) => {
    createTicket(data);
  };

  return (
    <Card className="h-full bg-sidebar p-2.5 rounded-xl max-w-7xl">
      <div className="rounded-xl bg-background shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl">工单</CardTitle>
              <p className="text-sm text-muted-foreground">
                管理并跟踪您的工单
              </p>
            </div>
            {/* 移除这里的DialogTrigger */}
            <Button
              className="flex items-center gap-2"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus size={18} />
              创建工单
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/*<div className="flex flex-col md:flex-row gap-4 items-start md:items-center">*/}
          {/*  <div className="flex-1 w-full md:w-auto">*/}
          {/*    <Label htmlFor="search" className="sr-only">*/}
          {/*      搜索工单*/}
          {/*    </Label>*/}
          {/*    <Input*/}
          {/*      id="search"*/}
          {/*      placeholder="请输入工单标题或内容..."*/}
          {/*      value={search}*/}
          {/*      onChange={(e) => setSearch(e.target.value)}*/}
          {/*      className="w-full"*/}
          {/*    />*/}
          {/*  </div>*/}
          {/*  /!* 这里可以添加状态和优先级过滤器 *!/*/}
          {/*</div>*/}
          <TicketTable
            search={search}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
          />
        </CardContent>
      </div>

      {/* 工单创建对话框 - 修改部分 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>创建新工单</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              id="hook-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid w-full gap-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标题</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入工单标题" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="请输入问题描述..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>类型</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择一个问题类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TicketType.BUG}>Bug</SelectItem>
                          <SelectItem value={TicketType.FEATURE}>
                            建议
                          </SelectItem>
                          <SelectItem value={TicketType.QUESTION}>
                            问题
                          </SelectItem>
                          <SelectItem value={TicketType.OTHER}>其他</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>优先级</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择优先级" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TicketPriority.LOW}>低</SelectItem>
                          <SelectItem value={TicketPriority.MEDIUM}>
                            中
                          </SelectItem>
                          <SelectItem value={TicketPriority.HIGH}>
                            高
                          </SelectItem>
                          <SelectItem value={TicketPriority.URGENT}>
                            紧急
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" form="hook-form" className="w-full" isLoading={isLoading}>
                创建工单
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

TicketList.getLayout = (page: ReactElement) => {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default TicketList;
