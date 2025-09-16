import React, { useEffect, useMemo, useState } from 'react';
import { Search, Loader, AlertTriangle, Mail, Phone, User as UserIcon } from 'lucide-react';
import type { Student, Class } from '../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';

const StudentManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('未找到登录凭据，请重新登录。');
      setIsLoadingClasses(false);
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      setError('登录信息已失效，请重新登录。');
      setIsLoadingClasses(false);
      return;
    }

    setTeacherId(decoded.sub);
  }, []);

  useEffect(() => {
    if (teacherId === null) return;

    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      setError(null);
      try {
        const response = await apiClient.get(`/teachers/${teacherId}/classes`);
        const list = Array.isArray(response) ? response : [];
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(String(list[0].class_id));
        }
      } catch (err: any) {
        setError(err.message || '获取班级列表失败');
      } finally {
        setIsLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      setError(null);
      try {
        const response = await apiClient.get(`/classes/${selectedClassId}/students`);
        setStudents(Array.isArray(response) ? response : []);
      } catch (err: any) {
        setError(err.message || '获取学生列表失败');
        setStudents([]);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedClassId]);

  const colorPalette = useMemo(() => [
    'from-blue-500 to-indigo-500',
    'from-emerald-500 to-teal-500',
    'from-purple-500 to-pink-500',
    'from-orange-500 to-amber-500',
    'from-sky-500 to-cyan-500',
  ], []);

  const getInitial = (fullName?: string | null, fallback?: string) => {
    const source = fullName?.trim() || fallback || '';
    if (!source) return '学';
    return source.charAt(0).toUpperCase();
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    return students.filter(student =>
      student.username.includes(searchTerm.trim()) ||
      student.full_name.includes(searchTerm.trim()),
    );
  }, [students, searchTerm]);

  const currentClassName = useMemo(() => {
    if (!selectedClassId) return '—';
    return classes.find(cls => String(cls.class_id) === selectedClassId)?.class_name ?? '—';
  }, [classes, selectedClassId]);

  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
  const [isProcessingRemoval, setIsProcessingRemoval] = useState(false);

  const handleRemoveStudent = async () => {
    if (!studentToRemove || !selectedClassId) return;

    setIsProcessingRemoval(true);
    try {
      await apiClient.delete(`/classes/${selectedClassId}/students/${studentToRemove.user_id}`);
      setStudents(prev => prev.filter(student => student.user_id !== studentToRemove.user_id));
      setStudentToRemove(null);
    } catch (err: any) {
      alert(`移除学生失败: ${err.message}`);
    } finally {
      setIsProcessingRemoval(false);
    }
  };

  const renderTableBody = () => {
    if (!selectedClassId) {
      return (
        <tr>
          <td colSpan={6} className="py-12 text-center text-gray-500">
            请先选择一个班级查看学生列表。
          </td>
        </tr>
      );
    }

    if (isLoadingStudents) {
      return (
        <tr>
          <td colSpan={6} className="py-12 text-center text-gray-500">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="animate-spin" size={18} />
              <span>正在加载学生数据...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (filteredStudents.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="py-12 text-center text-gray-500">
            {students.length === 0 ? '该班级暂无学生。' : '未找到符合条件的学生。'}
          </td>
        </tr>
      );
    }

    return filteredStudents.map((student, index) => (
      <tr key={student.user_id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{index + 1}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{student.username}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorPalette[index % colorPalette.length]} flex items-center justify-center text-white text-sm font-semibold`}>
              {getInitial(student.full_name, student.username)}
            </div>
            <div>
              <p className="font-medium text-gray-900">{student.full_name}</p>
              <p className="text-xs text-gray-500">学号 {student.username}</p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
          <div className="flex items-center space-x-2">
            <Mail size={14} className="text-blue-500" />
            <span>{student.email ?? '—'}</span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
          <div className="flex items-center space-x-2">
            <Phone size={14} className="text-emerald-500" />
            <span>{student.phone_number ?? '—'}</span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
          {student.created_at ? (
            <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-600">
              {new Date(student.created_at).toLocaleDateString()}
            </span>
          ) : '—'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
          <button
            onClick={() => setStudentToRemove(student)}
            className="underline underline-offset-2 hover:text-red-800"
          >
            移除
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">学生管理</h1>
          {selectedClassId && (
            <p className="text-sm text-gray-500 mt-1">当前班级：{currentClassName}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择班级</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={isLoadingClasses}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              {classes.length === 0 ? (
                <option value="" disabled>{isLoadingClasses ? '加载中...' : '暂无班级'}</option>
              ) : (
                classes.map(cls => (
                  <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">按学号/姓名搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="输入学号或姓名"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">学生列表</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">序号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学生姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机号码</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">加入时间</th>
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
        isOpen={!!studentToRemove}
        onClose={() => setStudentToRemove(null)}
        title="确认移除学生"
        size="small"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                确认将学生 <span className="font-medium text-gray-900">{studentToRemove?.full_name}</span> ({studentToRemove?.username}) 从班级
                <span className="font-medium text-gray-900"> {currentClassName}</span> 中移除吗？
              </p>
              <p className="text-xs text-gray-500 mt-1">移除后该学生需要重新使用班级码才能加入。</p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => setStudentToRemove(null)} disabled={isProcessingRemoval}>
              取消
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleRemoveStudent}
              disabled={isProcessingRemoval}
            >
              {isProcessingRemoval ? '移除中...' : '确认移除'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentManagement;
