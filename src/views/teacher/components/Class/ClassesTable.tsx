import React from 'react';
import { Users, Loader, AlertTriangle } from 'lucide-react';
import type { Class } from '@/views/teacher/types';
import Button from '@/views/teacher/components/shadcn/TeacherButton';
import { useRole } from '@/views/teacher/contexts/RoleContext';
import type { EnrichedClass } from '@/views/teacher/hooks/useClasses';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

interface ClassesTableProps {
  classes: EnrichedClass[];
  isLoading: boolean;
  error: string | null;
  onViewStudents: (classItem: Class) => void;
  onEdit: (classItem: Class) => void;
  onDelete: (classItem: Class) => void;
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ClassesTable: React.FC<ClassesTableProps> = ({
  classes,
  isLoading,
  error,
  onViewStudents,
  onEdit,
  onDelete,
}) => {
  const { role } = useRole();
  const colSpan = role?.id === 'teacher' ? 6 : 5;

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="animate-spin" size={18} />
              <span>正在加载班级...</span>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className="py-10 text-center text-destructive">
            <div className="flex flex-col items-center space-y-2">
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (classes.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
            尚未创建任何班级。
          </TableCell>
        </TableRow>
      );
    }

    return classes.map((classItem) => {
      const assistantNames = (classItem.assistants || []).map(assistant => assistant.full_name).join('，');

      return (
        <TableRow key={classItem.class_id}>
          <TableCell className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-muted-foreground mr-3" />
              <div className="text-sm font-medium text-foreground">
                {classItem.class_name}
              </div>
            </div>
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
            {classItem.class_code || '未设置'}
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
            {assistantNames || ''}
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
            {classItem.created_at ? (
              <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                {formatDate(classItem.created_at)}
              </span>
            ) : '—'}
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-primary">
            <Button
              onClick={() => onViewStudents(classItem)}
              className="h-auto p-0 text-primary hover:underline"
            >
              查看所有学生
            </Button>
          </TableCell>
          {role?.id === 'teacher' && (
            <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => onEdit(classItem)}
                  variant="outline"
                  size="sm"
                  title="修改班级"
                >
                  修改
                </Button>
                <Button
                  onClick={() => onDelete(classItem)}
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  title="删除班级"
                >
                  删除
                </Button>
              </div>
            </TableCell>
          )}
        </TableRow>
      );
    });
  };

  return (
    <div className="bg-card rounded-lg shadow-md">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">班级列表</h2>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">班级名称</TableHead>
              <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">班级代码</TableHead>
              <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">助教</TableHead>
              <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">创建时间</TableHead>
              <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">学生</TableHead>
              {role?.id === 'teacher' && (
                <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-card">
            {renderTableBody()}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
