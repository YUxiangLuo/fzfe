import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader, AlertTriangle, UserPlus } from 'lucide-react';
import type { User as Assistant, Class } from '../../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import { SelectAssistantModal } from './SelectAssistantModal';

const AssistantManagement: React.FC = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [managedClasses, setManagedClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);

  const [newAssistant, setNewAssistant] = useState({
    username: '', password: '', full_name: '', email: '', phone_number: '',
  });
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

  useEffect(() => {
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
          apiClient.get(`/teachers/${teacherId}/assistants`),
          apiClient.get(`/classes/teacher/${teacherId}/classes`)
        ]);

        setAssistants(assistantsData || []);
        setManagedClasses(classesData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
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

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setNewAssistant({ username: '', password: '', full_name: '', email: '', phone_number: '' });
    setSelectedClassIds([]);
  };

  const handleCreateAssistant = async () => {
    try {
      const payload = { ...newAssistant, class_ids: selectedClassIds };
      const createdAssistant = await apiClient.post('/assistants/create-and-assign', payload);
      setAssistants(prev => [createdAssistant, ...prev]);
      resetCreateModal();
    } catch (err: any) {
      alert(`创建失败: ${err.message}`);
    }
  };

  const handleAssignmentSuccess = (newlyAssigned: Assistant) => {
    if (!assistants.some(a => a.user_id === newlyAssigned.user_id)) {
      setAssistants(prev => [newlyAssigned, ...prev]);
    }
  };

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
                    {/* Placeholder for future actions */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <SelectAssistantModal isOpen={showSelectModal} onClose={() => setShowSelectModal(false)} managedClasses={managedClasses} existingAssistantIds={assistants.map(a => a.user_id)} onAssignmentSuccess={handleAssignmentSuccess} />
      
      <Modal isOpen={showCreateModal} onClose={resetCreateModal} title="创建新助教">
        <div className="space-y-4">
          <input name="full_name" value={newAssistant.full_name} onChange={handleInputChange} placeholder="姓名" className="w-full p-2 border rounded" />
          <input name="username" value={newAssistant.username} onChange={handleInputChange} placeholder="用户名" className="w-full p-2 border rounded" />
          <input name="password" type="password" value={newAssistant.password} onChange={handleInputChange} placeholder="初始密码" className="w-full p-2 border rounded" />
          <input name="email" type="email" value={newAssistant.email} onChange={handleInputChange} placeholder="邮箱" className="w-full p-2 border rounded" />
          <input name="phone_number" value={newAssistant.phone_number} onChange={handleInputChange} placeholder="手机号 (可选)" className="w-full p-2 border rounded" />
          
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
    </>
  );
};

export default AssistantManagement;