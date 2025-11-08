import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Loader, AlertTriangle, UserPlus, RefreshCw } from 'lucide-react';
import type { User as Assistant, Class } from '../../types';
import Modal from '../../../../shared/components/Modal';
import Button from '../../../../shared/components/Button';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import { SelectAssistantModal } from './SelectAssistantModal';
import { ReassignAssistantModal } from './ReassignAssistantModal';
import { validateUsername, validateFullName, validateEmail, validatePhone, validatePassword } from '../../../../shared/utils/validation';
import { useToast } from '../../../../shared/hooks/useToast';
import { Toast } from '../../../../shared/components/Toast';
import { UI_CONSTANTS } from '../../../../shared/constants/ui';

const AssistantManagement: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [managedClasses, setManagedClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [assistantToReassign, setAssistantToReassign] = useState<Assistant | null>(null);

  const handleCloseSelectModal = useCallback(() => {
    setShowSelectModal(false);
  }, []);

  const handleCloseReassignModal = useCallback(() => {
    setShowReassignModal(false);
    setAssistantToReassign(null);
  }, []);

  const INITIAL_ASSISTANT = useMemo(() => ({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone_number: '',
  }), []);
  const [newAssistant, setNewAssistant] = useState(INITIAL_ASSISTANT);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

  // P1-2: Add AbortController for proper cleanup
  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found.');
        const decoded = decodeToken(token);
        if (!decoded) throw new Error('Invalid token.');

        const teacherId = decoded.sub;

        const [assistantsData, classesData] = await Promise.all([
          apiClient.get(`/teachers/${teacherId}/assistants`, { signal: controller.signal }),
          apiClient.get(`/teachers/${teacherId}/classes`, { signal: controller.signal })
        ]);

        if (!controller.signal.aborted) {
          setAssistants(assistantsData || []);
          setManagedClasses(classesData || []);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setError(err.message || 'Failed to fetch data.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAssistant(prev => ({ ...prev, [name]: value }));
  };

  const handleClassSelection = (classId: number) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const resetCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setNewAssistant(INITIAL_ASSISTANT);
    setSelectedClassIds([]);
  }, [INITIAL_ASSISTANT]);

  const handleCreateAssistant = async () => {
    // 验证用户名
    const usernameValidation = validateUsername(newAssistant.username);
    if (!usernameValidation.valid) {
      showToast(usernameValidation.error, 'error');
      return;
    }

    // 验证姓名
    const nameValidation = validateFullName(newAssistant.full_name);
    if (!nameValidation.valid) {
      showToast(nameValidation.error, 'error');
      return;
    }

    // P2-1: 验证密码 - 使用常量
    const passwordValidation = validatePassword(newAssistant.password, {
      minLength: UI_CONSTANTS.PASSWORD_MIN_LENGTH
    });
    if (!passwordValidation.valid) {
      showToast(passwordValidation.error, 'error');
      return;
    }

    // 验证邮箱
    const emailValidation = validateEmail(newAssistant.email, true);
    if (!emailValidation.valid) {
      showToast(emailValidation.error, 'error');
      return;
    }

    // 验证手机号（必填）
    const phoneValidation = validatePhone(newAssistant.phone_number, true);
    if (!phoneValidation.valid) {
      showToast(phoneValidation.error, 'error');
      return;
    }

    // 验证班级选择
    if (selectedClassIds.length === 0) {
      showToast('请至少选择一个班级', 'error');
      return;
    }

    try {
      const payload = {
        username: newAssistant.username.trim(),
        password: newAssistant.password,
        full_name: newAssistant.full_name.trim(),
        email: newAssistant.email.trim(),
        phone_number: newAssistant.phone_number.trim(),
        role: 'Assistant',
        class_ids: selectedClassIds
      };
      const createdAssistant = await apiClient.post('/assistants', payload);
      setAssistants(prev => [createdAssistant, ...prev]);
      resetCreateModal();
      showToast('助教创建成功', 'success');
    } catch (err: any) {
      showToast(`创建失败: ${err.message}`, 'error');
    }
  };

  const handleAssignmentSuccess = (newlyAssigned: Assistant) => {
    if (!assistants.some(a => a.user_id === newlyAssigned.user_id)) {
      setAssistants(prev => [newlyAssigned, ...prev]);
    }
  };

  const openReassignModal = (assistant: Assistant) => {
    setAssistantToReassign(assistant);
    setShowReassignModal(true);
  };

  const handleUnbindComplete = useCallback((assistantId: number) => {
    // 从列表中移除已完全解绑的助教
    setAssistants(prev => prev.filter(a => a.user_id !== assistantId));
    showToast('助教已从所有班级解绑，已从当前列表移除', 'info');
  }, [showToast]);

  if (isLoading) return <div className="flex justify-center"><Loader className="animate-spin" /></div>;
  if (error) return <div className="text-red-500"><AlertTriangle /> {error}</div>;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">助教管理</h1>
          <div className="flex space-x-3">
            <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus size={16} className="mr-2" />
              创建助教
            </Button>
            <Button onClick={() => setShowSelectModal(true)} variant="outline">
              <UserPlus size={16} className="mr-2" />
              从库中选择
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">手机号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assistants.map(assistant => (
                <tr key={assistant.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">{assistant.full_name}</td>
                  <td className="px-6 py-4 text-sm">{assistant.username}</td>
                  <td className="px-6 py-4 text-sm">{assistant.phone_number || '-'}</td>
                  <td className="px-6 py-4 text-sm">{assistant.email}</td>
                  <td className="px-6 py-4">
                    <Button
                      variant="outline"
                      onClick={() => openReassignModal(assistant)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <RefreshCw size={16} className="mr-2" />重新分配
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <SelectAssistantModal
        isOpen={showSelectModal}
        onClose={handleCloseSelectModal}
        managedClasses={managedClasses}
        existingAssistantIds={assistants.map(a => a.user_id)}
        onAssignmentSuccess={handleAssignmentSuccess}
        showToast={showToast}
      />
      <ReassignAssistantModal
        isOpen={showReassignModal}
        onClose={handleCloseReassignModal}
        assistant={assistantToReassign}
        managedClasses={managedClasses}
        showToast={showToast}
        onUnbindComplete={handleUnbindComplete}
      />
      
      <Modal isOpen={showCreateModal} onClose={resetCreateModal} title="创建新助教">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input name="full_name" value={newAssistant.full_name} onChange={handleInputChange} placeholder="例如：张老师" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" minLength={2} maxLength={20} required />
            <p className="mt-1 text-xs text-gray-500">2-20个字符，允许中文和英文</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户名 <span className="text-red-500">*</span>
            </label>
            <input name="username" value={newAssistant.username} onChange={handleInputChange} placeholder="例如：zhang_assistant" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" required />
            <p className="mt-1 text-xs text-gray-500">3-20个字符，只能包含英文、数字和下划线</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              初始密码 <span className="text-red-500">*</span>
            </label>
            <input name="password" type="password" value={newAssistant.password} onChange={handleInputChange} placeholder={`至少${UI_CONSTANTS.PASSWORD_MIN_LENGTH}个字符`} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" minLength={UI_CONSTANTS.PASSWORD_MIN_LENGTH} maxLength={UI_CONSTANTS.PASSWORD_MAX_LENGTH} required />
            <p className="mt-1 text-xs text-gray-500">{UI_CONSTANTS.PASSWORD_MIN_LENGTH}-{UI_CONSTANTS.PASSWORD_MAX_LENGTH}个字符</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邮箱 <span className="text-red-500">*</span>
            </label>
            <input name="email" type="email" value={newAssistant.email} onChange={handleInputChange} placeholder="example@email.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
            <p className="mt-1 text-xs text-gray-500">用于接收系统通知</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              手机号 <span className="text-red-500">*</span>
            </label>
            <input
              name="phone_number"
              type="tel"
              value={newAssistant.phone_number}
              onChange={handleInputChange}
              placeholder="请输入11位手机号"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              pattern="1[3-9]\d{9}"
              required
            />
            <p className="mt-1 text-xs text-gray-500">请输入11位中国大陆手机号</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分配班级</label>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
              {managedClasses.map(cls => (
                <div key={cls.class_id} className="flex items-center">
                  <input 
                    type="checkbox" 
                    id={`create-cls-${cls.class_id}`} 
                    checked={selectedClassIds.includes(cls.class_id)}
                    onChange={() => handleClassSelection(cls.class_id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={`create-cls-${cls.class_id}`} className="ml-3 text-sm text-gray-700">{cls.class_name}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={resetCreateModal}>取消</Button>
            <Button onClick={handleCreateAssistant}>创建</Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
          position="bottom-right"
        />
      )}
    </>
  );
};

export default AssistantManagement;
