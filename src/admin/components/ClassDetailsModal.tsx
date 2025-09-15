import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Class, Student } from '../types';
import { apiClient } from '../../utils/apiClient';
import { User, Loader, AlertTriangle } from 'lucide-react';

interface ClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classInfo: Class | null;
}

export const ClassDetailsModal: React.FC<ClassDetailsModalProps> = ({ isOpen, onClose, classInfo }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && classInfo) {
      const fetchClassDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await apiClient.get(`/classes/${classInfo.class_id}`);
          setStudents(response.students || []);
        } catch (err: any) {
          setError(err.message || '获取学生数据失败');
        } finally {
          setIsLoading(false);
        }
      };

      fetchClassDetails();
    }
  }, [isOpen, classInfo]);

  const renderStudentList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader className="animate-spin text-gray-500" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col justify-center items-center h-40 text-red-500">
          <AlertTriangle />
          <p className="mt-2">加载失败: {error}</p>
        </div>
      );
    }

    if (students.length === 0) {
      return <p className="text-center text-gray-500 py-4">该班级暂无学生。</p>;
    }

    return (
      <ul className="divide-y divide-gray-200">
        {students.map((student) => (
          <li key={student.user_id} className="flex items-center p-3 hover:bg-gray-50">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mr-4">
              <User size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{student.full_name}</p>
              <p className="text-sm text-gray-500">{student.username}</p>
            </div>
            <p className="text-sm text-gray-500">{student.email}</p>
          </li>
        ))}
      </ul>
    );
  };

  if (!isOpen || !classInfo) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="班级详情" maxWidth="max-w-2xl">
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{classInfo.class_name}</h3>
          <p className="text-sm text-gray-600 mt-1">班级编号: <span className="font-medium">{classInfo.class_code}</span></p>
          <p className="text-sm text-gray-600">任课教师: <span className="font-medium">{classInfo.teacher_name}</span></p>
        </div>

        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-3">学生列表</h4>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
            {renderStudentList()}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button onClick={onClose} className="px-6 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg">关闭</button>
        </div>
      </div>
    </Modal>
  );
};
