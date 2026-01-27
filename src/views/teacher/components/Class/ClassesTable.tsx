import React from 'react';
import { Users, Loader, AlertTriangle } from 'lucide-react';
import type { Class } from '@/views/teacher/types';
import Button from '@/views/teacher/components/common/Button';
import { useRole } from '@/views/teacher/contexts/RoleContext';
import type { EnrichedClass } from '@/views/teacher/hooks/useClasses';

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
        <tr>
          <td colSpan={colSpan} className="py-10 text-center text-gray-500">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="animate-spin" size={18} />
              <span>正在加载班级...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={colSpan} className="py-10 text-center text-red-500">
            <div className="flex flex-col items-center space-y-2">
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          </td>
        </tr>
      );
    }

    if (classes.length === 0) {
      return (
        <tr>
          <td colSpan={colSpan} className="py-10 text-center text-gray-500">
            尚未创建任何班级。
          </td>
        </tr>
      );
    }

    return classes.map((classItem) => {
      const assistantNames = (classItem.assistants || []).map(assistant => assistant.full_name).join('，');

      return (
        <tr key={classItem.class_id} className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-gray-400 mr-3" />
              <div className="text-sm font-medium text-gray-900">
                {classItem.class_name}
              </div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
            {classItem.class_code || '未设置'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
            {assistantNames || ''}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
            {classItem.created_at ? (
              <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-600">
                {formatDate(classItem.created_at)}
              </span>
            ) : '—'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
            <button
              onClick={() => onViewStudents(classItem)}
              className="underline underline-offset-2 hover:text-blue-800 cursor-pointer"
            >
              查看所有学生
            </button>
          </td>
          {role?.id === 'teacher' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
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
                  size="sm"
                  className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                  title="删除班级"
                >
                  删除
                </Button>
              </div>
            </td>
          )}
        </tr>
      );
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">班级列表</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">班级名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">班级代码</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">助教</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学生</th>
              {role?.id === 'teacher' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {renderTableBody()}
          </tbody>
        </table>
      </div>
    </div>
  );
};
