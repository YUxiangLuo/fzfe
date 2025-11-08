import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Loader, AlertTriangle, Mail, Phone, User as UserIcon, UserPlus, ListPlus } from 'lucide-react';
import type { Student, Class } from '../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import { validateFullName, validateEmail, validatePhone, validatePassword } from '../../../../shared/utils/validation';
import SelectStudentModal from './SelectStudentModal';
import { useToast } from '../../../../shared/hooks/useToast';
import { Toast } from '../../../../shared/components/Toast';

interface NewStudentForm {
  username: string;
  full_name: string;
  email: string;
  phone_number: string;
  password: string;
}

const INITIAL_NEW_STUDENT: NewStudentForm = {
  username: '',
  full_name: '',
  email: '',
  phone_number: '',
  password: '',
};

const StudentManagement: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [shouldRefreshAfterSelectModal, setShouldRefreshAfterSelectModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStudent, setNewStudent] = useState<NewStudentForm>(INITIAL_NEW_STUDENT);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

    const controller = new AbortController();

    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      setError(null);
      try {
        const response = await apiClient.get(`/teachers/${teacherId}/classes`, { signal: controller.signal });

        if (!controller.signal.aborted) {
          const list = Array.isArray(response) ? response : [];
          setClasses(list);
          if (list.length > 0) {
            setSelectedClassId(String(list[0].class_id));
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;

        if (!controller.signal.aborted) {
          setError(err.message || '获取班级列表失败');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingClasses(false);
        }
      }
    };

    fetchClasses();

    return () => {
      controller.abort();
    };
  }, [teacherId]);

  const loadStudents = useCallback(async (classId: string, signal?: AbortSignal) => {
    setIsLoadingStudents(true);
    setError(null);
    try {
      const response = await apiClient.get(`/classes/${classId}/students`, { signal });

      if (!signal?.aborted) {
        const list = Array.isArray(response) ? response : [];
        const sorted = [...list].sort((a, b) => {
          const numA = Number(a.username);
          const numB = Number(b.username);
          if (Number.isNaN(numA) || Number.isNaN(numB)) {
            return a.username.localeCompare(b.username);
          }
          return numA - numB;
        });
        setStudents(sorted);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      if (!signal?.aborted) {
        setError(err.message || '获取学生列表失败');
        setStudents([]);
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoadingStudents(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }

    const controller = new AbortController();
    void loadStudents(selectedClassId, controller.signal);

    return () => {
      controller.abort();
    };
  }, [selectedClassId, loadStudents]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => {
      window.clearTimeout(handler);
    };
  }, [searchTerm]);

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
    if (!debouncedSearchTerm) return students;
    const query = debouncedSearchTerm.toLowerCase();
    return students.filter(student =>
      student.username.toLowerCase().includes(query) ||
      student.full_name.toLowerCase().includes(query),
    );
  }, [students, debouncedSearchTerm]);

  const currentClassName = useMemo(() => {
    if (!selectedClassId) return '—';
    return classes.find(cls => String(cls.class_id) === selectedClassId)?.class_name ?? '—';
  }, [classes, selectedClassId]);

  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
  const [isProcessingRemoval, setIsProcessingRemoval] = useState(false);
  const [studentForPasswordReset, setStudentForPasswordReset] = useState<Student | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [resetPasswordErrors, setResetPasswordErrors] = useState({ newPassword: '', confirmPassword: '' });
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleCloseRemoveStudentModal = useCallback(() => {
    if (isProcessingRemoval) return;
    setStudentToRemove(null);
  }, [isProcessingRemoval]);

  const handleClosePasswordResetModal = useCallback(() => {
    if (isResettingPassword) return;
    setStudentForPasswordReset(null);
  }, [isResettingPassword]);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    setNewStudent(INITIAL_NEW_STUDENT);
  }, []);

  const handleCloseSelectModal = useCallback(() => {
    setShowSelectModal(false);
    if (shouldRefreshAfterSelectModal && selectedClassId) {
      void loadStudents(selectedClassId);
      setShouldRefreshAfterSelectModal(false);
    }
  }, [shouldRefreshAfterSelectModal, selectedClassId, loadStudents]);

  const handleResetPassword = (student: Student) => {
    setStudentForPasswordReset(student);
    setResetPasswordForm({ newPassword: '', confirmPassword: '' });
    setResetPasswordErrors({ newPassword: '', confirmPassword: '' });
  };

  const handleResetPasswordConfirm = async () => {
    if (!studentForPasswordReset) return;

    const trimmedNewPassword = resetPasswordForm.newPassword.trim();
    const trimmedConfirm = resetPasswordForm.confirmPassword.trim();

    const newPasswordValidation = validatePassword(trimmedNewPassword, { minLength: 6, requireMixed: false });
    const newPasswordError = newPasswordValidation.valid ? '' : newPasswordValidation.error ?? '密码至少需要6位';
    const confirmError = trimmedConfirm ? (trimmedConfirm === trimmedNewPassword ? '' : '两次输入的密码不一致') : '请再次输入密码';

    setResetPasswordErrors({ newPassword: newPasswordError, confirmPassword: confirmError });

    if (newPasswordError || confirmError) {
      return;
    }

    setIsResettingPassword(true);
    try {
      await apiClient.post(`/users/${studentForPasswordReset.user_id}/reset-password`, {
        newPassword: trimmedNewPassword,
      });
      showToast(`学生 ${studentForPasswordReset.full_name} 的密码已成功更新。`, 'success');
      setStudentForPasswordReset(null);
    } catch (err: any) {
      showToast(`密码重置失败: ${err.message}`, 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };


  const handleOpenAddModal = () => {
    if (!selectedClassId) {
      showToast('请先选择一个班级', 'error');
      return;
    }
    setNewStudent({
      username: '',
      full_name: '',
      email: '',
      phone_number: '',
      password: '',
    });
    setShowAddModal(true);
  };

  const handleAddStudent = async () => {
    if (!selectedClassId) {
      showToast('请先选择一个班级', 'error');
      return;
    }

    const trimmedUsername = newStudent.username.trim();
    if (!/^\d{8,}$/.test(trimmedUsername)) {
      showToast('学号必须为至少8位的纯数字', 'error');
      return;
    }

    // 验证姓名
    const nameValidation = validateFullName(newStudent.full_name);
    if (!nameValidation.valid) {
      showToast(nameValidation.error || '姓名格式不正确', 'error');
      return;
    }

    // 验证密码
    const passwordValidation = validatePassword(newStudent.password, { minLength: 6, requireMixed: false });
    if (!passwordValidation.valid) {
      showToast(passwordValidation.error || '密码格式不正确', 'error');
      return;
    }

    // 验证邮箱（可选）
    if (newStudent.email.trim()) {
      const emailValidation = validateEmail(newStudent.email, false);
      if (!emailValidation.valid) {
        showToast(emailValidation.error || '邮箱格式不正确', 'error');
        return;
      }
    }

    // 验证手机号（可选）
    if (newStudent.phone_number.trim()) {
      const phoneValidation = validatePhone(newStudent.phone_number, false);
      if (!phoneValidation.valid) {
        showToast(phoneValidation.error || '手机号格式不正确', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 创建学生
      const payload: any = {
        username: trimmedUsername,
        full_name: newStudent.full_name.trim(),
        password: newStudent.password,
      };

      if (newStudent.email.trim()) {
        payload.email = newStudent.email.trim();
      }

      if (newStudent.phone_number.trim()) {
        payload.phone_number = newStudent.phone_number.trim();
      }

      const createdStudent = await apiClient.post<Student>(`/classes/${selectedClassId}/students`, payload);

      // 更新学生列表
      setStudents(prev => [...prev, createdStudent]);
      setNewStudent({
        username: '',
        full_name: '',
        email: '',
        phone_number: '',
        password: '',
      });
    } catch (err: any) {
      if (err.message.includes('409') || err.message.includes('已存在')) {
        showToast('学号或邮箱已存在，请检查后重试', 'error');
      } else {
        showToast(`添加学生失败: ${err.message}`, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!studentToRemove || !selectedClassId) return;

    setIsProcessingRemoval(true);
    try {
      await apiClient.delete(`/classes/${selectedClassId}/students/${studentToRemove.user_id}`);
      setStudents(prev => prev.filter(student => student.user_id !== studentToRemove.user_id));
      setStudentToRemove(null);
      showToast('学生已成功移除', 'success');
    } catch (err: any) {
      showToast(`移除学生失败: ${err.message}`, 'error');
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
              {formatDate(student.created_at)}
            </span>
          ) : '—'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handleResetPassword(student)}
              size="sm"
              title="重置学生密码"
              disabled={isResettingPassword}
            >
              {isResettingPassword ? '提交中...' : '设置新密码'}
            </Button>
            <Button
              onClick={() => setStudentToRemove(student)}
              variant="outline"
              size="sm"
              className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-red-500"
              title="从班级移除学生"
            >
              移除
            </Button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">学生管理</h1>
          {selectedClassId && (
            <p className="text-sm text-gray-500 mt-1">当前班级：{currentClassName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!selectedClassId) {
                showToast('请先选择一个班级', 'error');
                return;
              }
              setShowSelectModal(true);
            }}
          >
            <ListPlus size={16} className="mr-2" />
            从学生库中添加
          </Button>
          <Button onClick={handleOpenAddModal} className="bg-green-600 hover:bg-green-700">
            <UserPlus size={16} className="mr-2" />
            添加学生
          </Button>
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
        onClose={handleCloseRemoveStudentModal}
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
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleCloseRemoveStudentModal} disabled={isProcessingRemoval}>
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

      <Modal
        isOpen={!!studentForPasswordReset}
        onClose={handleClosePasswordResetModal}
        title="重置学生密码"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            为学生
            <span className="font-semibold text-blue-900 mx-1">
              {studentForPasswordReset?.full_name}
            </span>
            ({studentForPasswordReset?.username}) 设置新的登录密码。
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              新密码 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={resetPasswordForm.newPassword}
              onChange={(e) => {
                const value = e.target.value;
                setResetPasswordForm((prev) => ({ ...prev, newPassword: value }));
                setResetPasswordErrors((prev) => ({ ...prev, newPassword: '' }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="至少6个字符，可为纯数字"
              minLength={6}
              maxLength={20}
              disabled={isResettingPassword}
              required
            />
            {resetPasswordErrors.newPassword && (
              <p className="mt-1 text-xs text-red-500">{resetPasswordErrors.newPassword}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              确认新密码 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={resetPasswordForm.confirmPassword}
              onChange={(e) => {
                const value = e.target.value;
                setResetPasswordForm((prev) => ({ ...prev, confirmPassword: value }));
                setResetPasswordErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请再次输入新密码"
              minLength={6}
              maxLength={20}
              disabled={isResettingPassword}
              required
            />
            {resetPasswordErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{resetPasswordErrors.confirmPassword}</p>
            )}
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleClosePasswordResetModal}
              disabled={isResettingPassword}
            >
              取消
            </Button>
            <Button
              onClick={handleResetPasswordConfirm}
              disabled={isResettingPassword}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isResettingPassword ? '提交中...' : '确认修改'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        title="添加学生"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={newStudent.username}
              onChange={(e) => setNewStudent(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：20210001"
              minLength={8}
              maxLength={20}
              pattern="\\d{8,}"
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              仅支持数字，至少8位
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newStudent.full_name}
              onChange={(e) => setNewStudent(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：张三"
              minLength={2}
              maxLength={20}
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              2-20个字符，允许中文和英文
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              初始密码 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={newStudent.password}
              onChange={(e) => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="至少6个字符，可为纯数字"
              minLength={6}
              maxLength={20}
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              6-20个字符
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邮箱（可选）
            </label>
            <input
              type="email"
              value={newStudent.email}
              onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：zhangsan@example.com"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              未填写时系统将自动生成邮箱
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              手机号（可选）
            </label>
            <input
              type="tel"
              value={newStudent.phone_number}
              onChange={(e) => setNewStudent(prev => ({ ...prev, phone_number: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：13800138000"
              pattern="1[3-9]\d{9}"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              请输入11位中国大陆手机号
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>提示：</strong>学生将被添加到当前选择的班级 <span className="font-semibold">{currentClassName}</span>
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCloseAddModal}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? '添加中...' : '确认添加'}
            </Button>
          </div>
        </div>
      </Modal>

      <SelectStudentModal
        isOpen={showSelectModal}
        onClose={handleCloseSelectModal}
        classId={selectedClassId}
        onStudentEnrolled={() => {
          setShouldRefreshAfterSelectModal(true);
        }}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
};

export default StudentManagement;
