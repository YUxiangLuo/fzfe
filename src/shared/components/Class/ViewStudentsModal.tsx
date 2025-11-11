import React from 'react';
import { Loader, AlertTriangle, User as UserIcon } from 'lucide-react';
import type { Class, Student } from '@/shared/types';
import Modal from '@/shared/components/common/Modal';
import Button from '@/shared/components/common/Button';

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
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">{selectedClass.class_name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              班级代码: <span className="font-medium">{selectedClass.class_code || '未设置'}</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">学生总数：<span className="font-semibold text-gray-900">{students.length}</span></p>
          </div>
        )}

        <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader className="animate-spin mr-2" />正在加载学生...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 text-red-500">
              <AlertTriangle />
              <p className="mt-2">{error}</p>
            </div>
          ) : students.length === 0 ? (
            <p className="py-6 text-center text-gray-500">该班级暂无学生。</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {students.map(student => (
                <li key={student.user_id} className="flex items-center p-3 hover:bg-gray-50">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mr-4">
                    <UserIcon size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{student.full_name}</p>
                    <p className="text-sm text-gray-500">{student.username}</p>
                  </div>
                  <p className="text-sm text-gray-500">{student.email}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
};
