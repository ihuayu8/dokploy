import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/utils/api';
import {
  CheckCircle2Icon,
  ClockIcon,
  AlertCircleIcon,
  ChevronDown,
  InfoIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'open':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">进行中</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">已回复</Badge>;
    case 'resolved':
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">已解决</Badge>;
    case 'closed':
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">已关闭</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'low':
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">低</Badge>;
    case 'medium':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">中</Badge>;
    case 'high':
      return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">高</Badge>;
    case 'urgent':
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">紧急</Badge>;
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
};

interface TicketTableProps {
  search: string;
  statusFilter?: string[];
  priorityFilter?: string[];
}

export const TicketTable = ({ search }: TicketTableProps) => {
  const { data: tickets, isLoading, refetch } = api.ticket.all.useQuery({
    search,
    // priority: priorityFilter,
  },{
    enabled: true
  });

  const { mutate: deleteTicket } = api.ticket.delete.useMutation({
    onSuccess: () => {
      toast.success('工单删除成功');
      refetch();
    },
    onError: (error) => {
      toast.error(`工单删除失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">ID</TableHead>
            <TableHead>标题</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>优先级</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">加载中...</TableCell>
            </TableRow>
          ) : tickets?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">暂时没有工单</TableCell>
            </TableRow>
          ) : (
            tickets?.map((ticket) => (
              <TableRow key={ticket.ticketId} className="hover:bg-gray-50">
                <TableCell className="font-medium w-12">{ticket.ticketId}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/ticket/${ticket.ticketId}`} className="text-primary hover:underline">
                    {ticket.title}
                  </Link>
                </TableCell>
                <TableCell>{ticket.ticketType}</TableCell>
                <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                <TableCell>{new Date(ticket.createdAt).toLocaleString()}</TableCell>
                <TableCell className="text-right flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="p-1">
                        <ChevronDown size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/ticket/${ticket.ticketId}`}>
                          查看
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteTicket({ id: ticket.ticketId })}
                        className="text-red-500"
                      >
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};