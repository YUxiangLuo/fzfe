import React, { useEffect, useState } from 'react';
import { Plus, Users, Loader, AlertTriangle, Edit2, Trash2, User as UserIcon } from 'lucide-react';
import { Class } from '../../types';
import type { Assistant, Student } from '../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';

interface CreateClassForm {
  class_name: string;
  class_code: string;
}

interface EnrichedClass extends Class {
  assistants?: Assistant[];
}

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<EnrichedClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<CreateClassForm>({ class_name: '', class_code: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherId, setTeacherId] = useState<number | null>(null);
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

    setTeacherId(decoded.sub);
  }, []);

  useEffect(() => {
    if (teacherId === null) return;

    const fetchClasses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get(`/teachers/${teacherId}/classes`);
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
  }, [teacherId]);

  const handleOpenCreate = () => {
    setFormData({ class_name: '', class_code: '' });
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!formData.class_name.trim()) {
      alert('请填写班级名称');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, string> = {
        class_name: formData.class_name.trim(),
      };
      if (formData.class_code.trim()) {
        payload.class_code = formData.class_code.trim();
      }

      const createdClass = await apiClient.post('/classes', payload);
      setClasses(prev => [{ ...createdClass, assistants: [] }, ...prev]);
      setShowCreateModal(false);
      setFormData({ class_name: '', class_code: '' });
    } catch (err: any) {
      alert(`创建班级失败: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (classItem: Class) => {
    setSelectedClass(classItem);
    setFormData({
      class_name: classItem.class_name,
      class_code: classItem.class_code || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedClass) return;
    if (!formData.class_name.trim()) {
      alert('请填写班级名称');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, string> = {
        class_name: formData.class_name.trim(),
      };
      if (formData.class_code.trim()) {
        payload.class_code = formData.class_code.trim();
      }

      const updatedClass = await apiClient.put(`/classes/${selectedClass.class_id}`, payload);
      setClasses(prev =>
        prev.map(cls =>
          cls.class_id === updatedClass.class_id
            ? { ...cls, ...updatedClass, assistants: cls.assistants }
            : cls
        )
      );
      setShowEditModal(false);
      setSelectedClass(null);
      setFormData({ class_name: '', class_code: '' });
    } catch (err: any) {
      alert(`更新班级失败: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (classItem: Class) => {
    if (!window.confirm(`确定要删除班级“${classItem.class_name}”吗？`)) return;

    try {
      await apiClient.delete(`/classes/${classItem.class_id}`);
      setClasses(prev => prev.filter(cls => cls.class_id !== classItem.class_id));
      if (selectedClass && selectedClass.class_id === classItem.class_id) {
        setShowEditModal(false);
        setSelectedClass(null);
        setFormData({ class_name: '', class_code: '' });
      }
    } catch (err: any) {
      alert(`删除班级失败: ${err.message}`);
    }
  };

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
          <td colSpan={6} className="py-10 text-center text-gray-500">
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
          <td colSpan={6} className="py-10 text-center text-red-500">
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
          <td colSpan={6} className="py-10 text-center text-gray-500">
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
            {classItem.created_at ? new Date(classItem.created_at).toLocaleDateString() : '未知'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
            <button
              onClick={() => handleViewStudents(classItem)}
              className="underline underline-offset-2 hover:text-blue-800"
            >
              查看所有学生
            </button>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleOpenEdit(classItem)}
                className="text-blue-600 hover:text-blue-800"
                title="修改班级"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(classItem)}
                className="text-red-600 hover:text-red-800"
                title="删除班级"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">班级管理</h1>
        <div className="flex space-x-3">
          <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus size={16} className="mr-2" />
            新增班级
          </Button>
        </div>
      </div>

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
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
        onClose={() => {
          setShowStudentsModal(false);
          setSelectedClass(null);
          setStudents([]);
          setStudentsError(null);
        }}
        title={selectedClass ? `${selectedClass.class_name} 的学生列表` : '学生列表'}
      >
        <div className="space-y-4">
          {selectedClass && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">{selectedClass.class_name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                班级代码: <span className="font-medium">{selectedClass.class_code || '未设置'}</span>
              </p>
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
            <Button variant="outline" onClick={() => setShowStudentsModal(false)}>
              关闭
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({ class_name: '', class_code: '' });
        }}
        title="新增班级"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">班级名称</label>
            <input
              type="text"
              value={formData.class_name}
              onChange={(e) => setFormData(prev => ({ ...prev, class_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入班级名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">班级代码（可选）</label>
            <input
              type="text"
              value={formData.class_code}
              onChange={(e) => setFormData(prev => ({ ...prev, class_code: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：SEM2025"
            />
            <p className="mt-2 text-xs text-gray-500">班级代码可用于学生通过班级码加入班级。</p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setFormData({ class_name: '', class_code: '' });
              }}
            >
              取消
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? '创建中...' : '创建'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedClass(null);
          setFormData({ class_name: '', class_code: '' });
        }}
        title="修改班级信息"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">班级名称</label>
            <input
              type="text"
              value={formData.class_name}
              onChange={(e) => setFormData(prev => ({ ...prev, class_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入班级名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">班级代码（可选）</label>
            <input
              type="text"
              value={formData.class_code}
              onChange={(e) => setFormData(prev => ({ ...prev, class_code: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：SEM2025"
            />
            <p className="mt-2 text-xs text-gray-500">班级代码可用于学生通过班级码加入班级。</p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setSelectedClass(null);
                setFormData({ class_name: '', class_code: '' });
              }}
            >
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClassManagement;
