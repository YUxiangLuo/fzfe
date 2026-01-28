import React from 'react';
import { CheckCircle, AlertTriangle, User as UserIcon } from 'lucide-react';
import type { Class, Student } from '@/views/teacher/types';
import Modal from '@/views/teacher/components/shadcn/TeacherModal';
import Button from '@/views/teacher/components/shadcn/TeacherButton';

interface CreateClassResponse {
  class: Class;
  students_created: number;
  students_enrolled: number;
  students: Student[];
  errors: string[];
}

interface CreateResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CreateClassResponse | null;
}

export const CreateResultModal: React.FC<CreateResultModalProps> = ({ isOpen, onClose, result }) => {
  if (!result) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="班级创建成功">
      <div className="space-y-4">
        {/* 成功提示 */}
        <div className="flex items-center space-x-3 p-4 bg-success/10 border border-success/20 rounded-lg">
          <CheckCircle size={24} className="text-success flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-success">班级创建成功！</p>
            <p className="text-xs text-success mt-1">
              班级 "{result.class.class_name}" 已成功创建
              {result.class.class_code && ` (班级代码: ${result.class.class_code})`}
            </p>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <p className="text-2xl font-bold text-primary">{result.students_created}</p>
            <p className="text-sm text-muted-foreground mt-1">新创建学生</p>
          </div>
          <div className="bg-info/10 p-4 rounded-lg border border-info/20">
            <p className="text-2xl font-bold text-info">{result.students_enrolled}</p>
            <p className="text-sm text-muted-foreground mt-1">加入班级学生</p>
          </div>
        </div>

        {/* 错误信息 */}
        {result.errors && result.errors.length > 0 && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle size={18} className="text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-warning">部分学生创建失败</p>
                <ul className="mt-2 space-y-1 text-xs text-warning">
                  {result.errors.map((error, index) => (
                    <li key={index} className="list-disc list-inside">{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 学生列表 */}
        {result.students && result.students.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">学生列表</h3>
            <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
              <ul className="divide-y divide-border">
                {result.students.map((student) => (
                  <li key={student.user_id} className="flex items-center p-3 hover:bg-muted">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mr-3">
                      <UserIcon size={16} className="text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">{student.username}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 关闭按钮 */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={onClose}>
            完成
          </Button>
        </div>
      </div>
    </Modal>
  );
};
