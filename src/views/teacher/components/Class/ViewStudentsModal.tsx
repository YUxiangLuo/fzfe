import React from 'react';
import { Loader, AlertTriangle, User as UserIcon } from 'lucide-react';
import type { Class, Student } from '@/views/teacher/types';
import Modal from '@/views/teacher/components/shadcn/TeacherModal';
import Button from '@/views/teacher/components/shadcn/TeacherButton';

interface ViewStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: Class | null;
  students: Student[];
  isLoading: boolean;
  error: string | null;
}

export const ViewStudentsModal: React.FC<ViewStudentsModalProps> = ({
  isOpen,
  onClose,
  selectedClass,
  students,
  isLoading,
  error,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedClass ? `${selectedClass.class_name} 的学生列表` : '学生列表'}
    >
      <div className="space-y-4">
        {selectedClass && (
          <div className="bg-muted p-4 rounded-xl border border-border">
            <h3 className="text-lg font-bold text-foreground">{selectedClass.class_name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              班级代码: <span className="font-medium">{selectedClass.class_code || '未设置'}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">学生总数：<span className="font-semibold text-foreground">{students.length}</span></p>
          </div>
        )}

        <div className="max-h-72 overflow-y-auto border border-border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader className="animate-spin mr-2" />正在加载学生...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 text-destructive">
              <AlertTriangle />
              <p className="mt-2">{error}</p>
            </div>
          ) : students.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">该班级暂无学生。</p>
          ) : (
            <ul className="divide-y divide-border">
              {students.map(student => (
                <li key={student.user_id} className="flex items-center p-3 hover:bg-muted">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mr-4">
                    <UserIcon size={16} className="text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{student.full_name}</p>
                    <p className="text-sm text-muted-foreground">{student.username}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
};
