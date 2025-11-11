import React from 'react';
import { CheckCircle, AlertTriangle, User as UserIcon } from 'lucide-react';
import type { Class, Student } from '@/shared/types';
import Modal from '@/shared/components/common/Modal';
import Button from '@/shared/components/common/Button';

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
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-900">班级创建成功！</p>
            <p className="text-xs text-green-700 mt-1">
              班级 "{result.class.class_name}" 已成功创建
              {result.class.class_code && ` (班级代码: ${result.class.class_code})`}
            </p>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-2xl font-bold text-blue-600">{result.students_created}</p>
            <p className="text-sm text-gray-600 mt-1">新创建学生</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <p className="text-2xl font-bold text-indigo-600">{result.students_enrolled}</p>
            <p className="text-sm text-gray-600 mt-1">加入班级学生</p>
          </div>
        </div>

        {/* 错误信息 */}
        {result.errors && result.errors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900">部分学生创建失败</p>
                <ul className="mt-2 space-y-1 text-xs text-yellow-800">
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
            <h3 className="text-sm font-semibold text-gray-900 mb-2">学生列表</h3>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              <ul className="divide-y divide-gray-200">
                {result.students.map((student) => (
                  <li key={student.user_id} className="flex items-center p-3 hover:bg-gray-50">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mr-3">
                      <UserIcon size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{student.full_name}</p>
                      <p className="text-xs text-gray-500">{student.username}</p>
                    </div>
                    <p className="text-xs text-gray-500">{student.email}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 关闭按钮 */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <Button onClick={onClose}>
            完成
          </Button>
        </div>
      </div>
    </Modal>
  );
};
