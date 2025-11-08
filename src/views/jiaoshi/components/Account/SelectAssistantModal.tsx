import React, { useState, useEffect } from 'react';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import { apiClient } from '../../../../utils/apiClient';
import type { User as Assistant, Class } from '../../types';
import { Loader, AlertTriangle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../Common/Toast';

interface SelectAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignmentSuccess: (newAssistant: Assistant) => void;
  managedClasses: Class[];
  existingAssistantIds: number[];
}

export const SelectAssistantModal: React.FC<SelectAssistantModalProps> = ({
  isOpen,
  onClose,
  onAssignmentSuccess,
  managedClasses,
  existingAssistantIds,
}) => {
  const { toast, showToast, hideToast } = useToast();
  const [allAssistants, setAllAssistants] = useState<Assistant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAssistantId, setSelectedAssistantId] = useState<number | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchAllAssistants = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await apiClient.get('/assistants');
          setAllAssistants(data.filter((a: Assistant) => !existingAssistantIds.includes(a.user_id)) || []);
        } catch (err: any) {
          setError(err.message || '获取助教库失败');
        } finally {
          setIsLoading(false);
        }
      };
      fetchAllAssistants();
    }
  }, [isOpen, existingAssistantIds]);

  const handleClassSelection = (classId: number) => {
    setSelectedClassIds(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleAssign = async () => {
    if (!selectedAssistantId || selectedClassIds.length === 0) {
      showToast('请选择一位助教并分配至少一个班级。', 'error');
      return;
    }

    try {
      await Promise.all(
        selectedClassIds.map(classId =>
          apiClient.post(`/classes/${classId}/assistants`, { assistant_id: selectedAssistantId })
        )
      );

      const assignedAssistant = allAssistants.find(a => a.user_id === selectedAssistantId);
      if (assignedAssistant) {
        onAssignmentSuccess(assignedAssistant);
      }
      showToast('助教分配成功', 'success');
      handleClose();
    } catch (err: any) {
      showToast(`分配失败: ${err.message}`, 'error');
    }
  };

  const handleClose = () => {
    setSelectedAssistantId(null);
    setSelectedClassIds([]);
    onClose();
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center"><Loader className="animate-spin" /></div>;
    if (error) return <div className="text-red-500"><AlertTriangle /> {error}</div>;
    if (allAssistants.length === 0) return <p className="text-gray-500">助教库中暂无新的助教可供选择。</p>;

    return (
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="font-medium text-gray-800">1. 选择一位助教</h3>
          <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
            {allAssistants.map(assistant => (
              <label key={assistant.user_id} className={`flex items-center p-2 rounded-lg cursor-pointer ${selectedAssistantId === assistant.user_id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                <input
                  type="radio"
                  name="assistant"
                  checked={selectedAssistantId === assistant.user_id}
                  onChange={() => setSelectedAssistantId(assistant.user_id)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm font-medium text-gray-900">{assistant.full_name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="font-medium text-gray-800">2. 分配至班级</h3>
          <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
            {managedClasses.map(cls => (
              <label key={cls.class_id} className="flex items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedClassIds.includes(cls.class_id)}
                  onChange={() => handleClassSelection(cls.class_id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700">{cls.class_name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="从库中选择助教">
      <div className="space-y-4">
        {renderContent()}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={handleClose}>取消</Button>
          <Button onClick={handleAssign} disabled={!selectedAssistantId || selectedClassIds.length === 0}>确认分配</Button>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </Modal>
  );
};
