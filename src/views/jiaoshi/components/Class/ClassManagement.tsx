import React, { useEffect, useState } from 'react';
import { Plus, Users, Loader, AlertTriangle, Edit2, Trash2, User as UserIcon, Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import type { Class, Assistant, Student } from '../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import { validateClassName, validateClassCode } from '../../utils/validation';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../hooks/useConfirm';
import { Toast } from '../Common/Toast';
import { ConfirmDialog } from '../Common/ConfirmDialog';

interface CreateClassForm {
  class_name: string;
  class_code: string;
}

interface EnrichedClass extends Class {
  assistants?: Assistant[];
}

interface CreateClassResponse {
  class: Class;
  students_created: number;
  students_enrolled: number;
  students: Student[];
  errors: string[];
}

const MAX_CSV_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ClassManagement: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();
  const confirm = useConfirm();
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
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [createResult, setCreateResult] = useState<CreateClassResponse | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

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
    setCsvFile(null);
    setShowCreateModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件扩展名
      if (!file.name.endsWith('.csv')) {
        showToast('请上传 CSV 格式的文件', 'error');
        e.target.value = '';
        return;
      }

      // 验证 MIME 类型
      if (file.type && !['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.type)) {
        showToast('文件类型不正确，请上传有效的 CSV 文件', 'error');
        e.target.value = '';
        return;
      }

      // 验证文件大小
      if (file.size > MAX_CSV_FILE_SIZE) {
        showToast('文件大小不能超过 5MB', 'error');
        e.target.value = '';
        return;
      }

      setCsvFile(file);
    }
  };

  const handleRemoveFile = () => {
    setCsvFile(null);
    const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleCreate = async () => {
    // 验证班级名称
    const nameValidation = validateClassName(formData.class_name);
    if (!nameValidation.valid) {
      showToast(nameValidation.error || '班级名称格式不正确', 'error');
      return;
    }

    // 验证班级代码
    const codeValidation = validateClassCode(formData.class_code);
    if (!codeValidation.valid) {
      showToast(codeValidation.error || '班级代码格式不正确', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('class_name', formData.class_name.trim());
      formDataToSend.append('class_code', formData.class_code.trim());
      if (csvFile) {
        formDataToSend.append('student_list', csvFile);
      }

      const result = await apiClient.postFormData<CreateClassResponse>('/classes', formDataToSend);

      // 添加新班级到列表
      setClasses(prev => [{ ...result.class, assistants: [] }, ...prev]);

      // 显示创建结果
      setCreateResult(result);
      setShowCreateModal(false);
      setShowResultModal(true);

      // 重置表单
      setFormData({ class_name: '', class_code: '' });
      setCsvFile(null);

      showToast('班级创建成功', 'success');
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('操作失败，请稍后重试', 'error');
      }
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

    // 验证班级名称
    const nameValidation = validateClassName(formData.class_name);
    if (!nameValidation.valid) {
      showToast(nameValidation.error || '班级名称格式不正确', 'error');
      return;
    }

    // 验证班级代码
    const codeValidation = validateClassCode(formData.class_code);
    if (!codeValidation.valid) {
      showToast(codeValidation.error || '班级代码格式不正确', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        class_name: formData.class_name.trim(),
        class_code: formData.class_code.trim(),
      };

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

      showToast('班级信息更新成功', 'success');
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('操作失败，请稍后重试', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (classItem: Class) => {
    const confirmed = await confirm.showConfirm(
      `确定要删除班级"${classItem.class_name}"吗？`,
      '此操作不可撤销，删除班级将同时移除该班级下的所有关联数据。',
      'danger'
    );

    if (!confirmed) return;

    try {
      await apiClient.delete(`/classes/${classItem.class_id}`);

      setClasses(prev => prev.filter(cls => cls.class_id !== classItem.class_id));
      if (selectedClass && selectedClass.class_id === classItem.class_id) {
        setShowEditModal(false);
        setSelectedClass(null);
        setFormData({ class_name: '', class_code: '' });
      }

      showToast('班级删除成功', 'success');
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('操作失败，请稍后重试', 'error');
      }
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
              className="underline underline-offset-2 hover:text-blue-800 cursor-pointer"
            >
              查看所有学生
            </button>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => handleOpenEdit(classItem)}
                variant="outline"
                size="sm"
                title="修改班级"
              >
                修改
              </Button>
              <Button
                onClick={() => handleDelete(classItem)}
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                title="删除班级"
              >
                删除
              </Button>
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
          setCsvFile(null);
        }}
        title="新增班级"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              班级名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.class_name}
              onChange={(e) => setFormData(prev => ({ ...prev, class_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：2024级计算机1班"
              maxLength={50}
            />
            <p className="mt-1 text-xs text-gray-500">
              2-50个字符，可包含中文、英文、数字、短横线和下划线
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              班级代码 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.class_code}
              onChange={(e) => setFormData(prev => ({ ...prev, class_code: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：CS101-2025"
              maxLength={20}
            />
            <p className="mt-1 text-xs text-gray-500">
              2-20个字符，只能包含英文、数字、短横线和下划线
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">学生名单（可选）</label>
            <div className="space-y-2">
              {!csvFile ? (
                <div className="relative">
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="csv-file-input"
                    className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                  >
                    <Upload size={20} className="text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">点击上传 CSV 文件</span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText size={20} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{csvFile.name}</p>
                      <p className="text-xs text-gray-500">{(csvFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="移除文件"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500">
                上传 CSV 文件将自动创建学生账号并加入班级。CSV 文件需包含学号和姓名字段。
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setFormData({ class_name: '', class_code: '' });
                setCsvFile(null);
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              班级名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.class_name}
              onChange={(e) => setFormData(prev => ({ ...prev, class_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：2024级计算机1班"
              maxLength={50}
            />
            <p className="mt-1 text-xs text-gray-500">
              2-50个字符，可包含中文、英文、数字、短横线和下划线
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              班级代码 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.class_code}
              onChange={(e) => setFormData(prev => ({ ...prev, class_code: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：CS101-2025"
              maxLength={20}
            />
            <p className="mt-1 text-xs text-gray-500">
              2-20个字符，只能包含英文、数字、短横线和下划线
            </p>
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

      <Modal
        isOpen={showResultModal}
        onClose={() => {
          setShowResultModal(false);
          setCreateResult(null);
        }}
        title="班级创建成功"
      >
        {createResult && (
          <div className="space-y-4">
            {/* 成功提示 */}
            <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-900">班级创建成功！</p>
                <p className="text-xs text-green-700 mt-1">
                  班级 "{createResult.class.class_name}" 已成功创建
                  {createResult.class.class_code && ` (班级代码: ${createResult.class.class_code})`}
                </p>
              </div>
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-2xl font-bold text-blue-600">{createResult.students_created}</p>
                <p className="text-sm text-gray-600 mt-1">新创建学生</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <p className="text-2xl font-bold text-indigo-600">{createResult.students_enrolled}</p>
                <p className="text-sm text-gray-600 mt-1">加入班级学生</p>
              </div>
            </div>

            {/* 错误信息 */}
            {createResult.errors && createResult.errors.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-900">部分学生创建失败</p>
                    <ul className="mt-2 space-y-1 text-xs text-yellow-800">
                      {createResult.errors.map((error, index) => (
                        <li key={index} className="list-disc list-inside">{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 学生列表 */}
            {createResult.students && createResult.students.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">学生列表</h3>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  <ul className="divide-y divide-gray-200">
                    {createResult.students.map((student) => (
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
              <Button onClick={() => {
                setShowResultModal(false);
                setCreateResult(null);
              }}>
                完成
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      <ConfirmDialog
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        variant={confirm.variant}
        onConfirm={confirm.handleConfirm}
        onCancel={confirm.handleCancel}
      />
    </div>
  );
};

export default ClassManagement;
