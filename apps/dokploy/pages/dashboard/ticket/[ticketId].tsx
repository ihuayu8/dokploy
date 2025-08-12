import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2Icon, ClockIcon, InfoIcon, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {ReactElement, useEffect} from "react";
import {DashboardLayout} from "@/components/layouts/dashboard-layout";
import TicketList from "@/pages/dashboard/ticket/index";
import {toast} from "sonner";
import {Badge} from "@/components/ui/badge";

enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

const updateTicketSchema = z.object({
  status: z.enum(Object.values(TicketStatus) as [string, ...string[]]),
  priority: z.enum(Object.values(TicketPriority) as [string, ...string[]]),
  description: z.string().optional(),
});

const addCommentSchema = z.object({
  content: z.string().min(3, { message: 'Comment must be at least 3 characters' }),
});

const TicketDetail = () => {
  const router = useRouter();
  const { ticketId } = router.query;

  const { data: ticket, isLoading, refetch } = api.ticket.one.useQuery({
    id: ticketId,
  },{
    enabled: !!ticketId,
  });


  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low':
        return "低";
      case 'medium':
        return "中";
      case 'high':
        return "高";
      case 'urgent':
        return "紧急";
      default:
        return priority;
    }
  };

  const updateForm = useForm<z.infer<typeof updateTicketSchema>>({});
  const commentForm = useForm<z.infer<typeof addCommentSchema>>({
    defaultValues: {
      content: '',
    }
  });

  const { mutate: updateTicket } = api.ticket.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: addComment } = api.ticket.addComment.useMutation({
    onSuccess: () => {
      toast.success('回复成功');
      commentForm.reset();
      refetch();
    },
  });

  const handleClose = () => {
    if (!ticketId) return;
    updateTicket({
      ticketId: parseInt(ticketId),
      status: TicketStatus.CLOSED,
    });
  };

  const handleAddComment = (data: z.infer<typeof addCommentSchema>) => {
    if (!ticketId) return;
    addComment({
      ticketId: ticketId,
      content: data.content,
    });
  };

  if (isLoading) {
    return <div className="py-8 text-center">Loading ticket details...</div>;
  }

  if (!ticket) {
    return <div className="py-8 text-center">Ticket not found</div>;
  }

  return (
    <div className="space-y-6 w-full">
      <Card className="h-full bg-sidebar p-2.5 rounded-xl">
        <div className="rounded-xl bg-background shadow-md">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Link href="/dashboard/ticket" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft size={20} />
              </Link>
              <CardTitle className="text-xl">{ticket?.title}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                #{ticket?.ticketId}
              </span>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                {getPriorityLabel(ticket.priority)}
              </span>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(ticket.status)}`}>
                {getStatusLabel(ticket.status)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">创建时间</p>
                <p className="font-medium">{new Date(ticket.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">工单类型</p>
                <p className="font-medium">{ticket?.ticketType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">创建人</p>
                <p className="font-medium">{ticket?.user?.name || 'Unknown'}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">描述</p>
              <div className="mt-1 p-4 bg-gray-50 rounded-lg border border-gray-100 whitespace-pre-line">
                {ticket.description}
              </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">回复</h3>
            {ticket.comments && ticket.comments.length > 0 ? (
                <div className="space-y-4">
                  {ticket.comments.map((comment) => (
                      <div key={comment.commentId} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          {comment.user?.name === 'admin' ? (
                            <p className="font-bold text-xs bg-clip-text text-transparent bg-gradient-to-l from-green-400 to-teal-500">管理员</p>
                          ) : (
                            <p className="font-bold text-xs">{comment.user?.name || 'Unknown'}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p>{comment.content}</p>
                      </div>
                  ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-4">暂无回复</p>
            )}
          </CardContent>
        </div>
        {ticket.status !== TicketStatus.CLOSED && (<div className="rounded-xl bg-background shadow-md mt-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-muted-foreground" />
              <CardTitle>回复</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...commentForm}>
              <form
                  id="hook-form"
                  onSubmit={commentForm.handleSubmit(handleAddComment)}
                  className="grid w-full gap-4"
              >
                <FormField
                    control={commentForm.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                                placeholder="请输入回复内容..."
                                className="min-h-[100px]"
                                {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex flex-row gap-4">
                  <Button type="submit" className="w-1/2">
                    立即回复
                  </Button>
                  <Button variant="outline" type="button" onClick={handleClose} className="w-1/2">
                    关闭工单
                  </Button>
                </div>
              </form>
            </Form>


          </CardContent>
        </div>)}
      </Card>
    </div>
  );
};

// 辅助函数
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'open':
      return '进行中';
    case 'in_progress':
      return '已回复';
    case 'resolved':
      return '已解决';
    case 'closed':
      return '已关闭';
    default:
      return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'resolved':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'closed':
      return 'bg-gray-100 text-gray-800 border border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low':
      return 'bg-gray-100 text-gray-800 border border-gray-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 'urgent':
      return 'bg-red-100 text-red-800 border border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

TicketDetail.getLayout = (page: ReactElement) => {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default TicketDetail;