import React, { useEffect, useState, useCallback } from 'react';
import { Users, Loader, AlertTriangle, User as UserIcon } from 'lucide-react';
import type { Class, Assistant, Student } from '../../types';
import Modal from '../Common/Modal';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';

interface EnrichedClass extends Class {
  assistants?: Assistant[];
}

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<EnrichedClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assistantId, setAssistantId] = useState<number | null>(null);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('未找到登录凭据，请重新登录。');
      setIsLoading(false);
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      setError('登录信息已失效，请重新登录。');
      setIsLoading(false);
      return;
    }

    setAssistantId(decoded.sub);
  }, []);

  useEffect(() => {
    if (assistantId === null) return;

    const fetchClasses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get(`/assistants/${assistantId}/classes`);
        if (!Array.isArray(data)) {
          setClasses([]);
          setIsLoading(false);
          return;
        }

        const enrichedClasses = await Promise.all(
          data.map(async (cls: Class) => {
            try {
              const assistants = await apiClient.get(`/classes/${cls.class_id}/assistants`);
              return { ...cls, assistants: Array.isArray(assistants) ? assistants : [] } as EnrichedClass;
            } catch (assistErr) {
              console.error(`Failed to fetch assistants for class ${cls.class_id}`, assistErr);
              return { ...cls, assistants: [] } as EnrichedClass;
            }
          })
        );

        setClasses(enrichedClasses);
      } catch (err: any) {
        setError(err.message || '获取班级列表失败');
        setClasses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, [assistantId]);

  const handleViewStudents = async (classItem: Class) => {
    setSelectedClass(classItem);
    setShowStudentsModal(true);
    setStudents([]);
    setStudentsError(null);
    setIsStudentsLoading(true);

    try {
      const response = await apiClient.get(`/classes/${classItem.class_id}`);
      setStudents(response.students || []);
    } catch (err: any) {
      setStudentsError(err.message || '获取学生列表失败');
    } finally {
      setIsStudentsLoading(false);
    }
  };

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={5} className="py-10 text-center text-gray-500">
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
          <td colSpan={5} className="py-10 text-center text-red-500">
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
          <td colSpan={5} className="py-10 text-center text-gray-500">
            您当前没有管理的班级。
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
            {classItem.teacher_name || '未知'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
            {assistantNames || '无'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
            <button
              onClick={() => handleViewStudents(classItem)}
              className="underline underline-offset-2 hover:text-blue-800 cursor-pointer"
            >
              查看学生
            </button>
          </td>
        </tr>
      );
    });
  };

  const handleCloseStudentsModal = useCallback(() => {
    setShowStudentsModal(false);
    setSelectedClass(null);
    setStudents([]);
    setStudentsError(null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">班级管理</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">我管理的班级</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">班级名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">班级代码</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">任课教师</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">助教</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学生</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {renderTableBody()}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showStudentsModal}
        onClose={handleCloseStudentsModal}
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
            {isStudentsLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-500">
                <Loader className="animate-spin mr-2" />正在加载学生...
              </div>
            ) : studentsError ? (
              <div className="flex flex-col items-center justify-center py-10 text-red-500">
                <AlertTriangle />
                <p className="mt-2">{studentsError}</p>
              </div>
            ) : students.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-gray-500">
                该班级暂无学生
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.user_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{student.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClassManagement;
