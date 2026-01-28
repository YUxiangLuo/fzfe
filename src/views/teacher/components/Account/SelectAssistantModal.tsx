import React, { useState, useEffect } from 'react';
import Modal from '@/views/teacher/components/shadcn/TeacherModal';
import Button from '@/views/teacher/components/shadcn/TeacherButton';
import { apiClient } from '@/utils/apiClient';
import type { User as Assistant, Class } from '@/views/teacher/types';
import { Loader, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface SelectAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignmentSuccess: (newAssistant: Assistant) => void;
  managedClasses: Class[];
  existingAssistantIds: number[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SelectAssistantModal: React.FC<SelectAssistantModalProps> = ({
  isOpen,
  onClose,
  onAssignmentSuccess,
  managedClasses,
  existingAssistantIds,
  showToast,
}) => {
  const [allAssistants, setAllAssistants] = useState<Assistant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAssistantId, setSelectedAssistantId] = useState<number | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    if (isOpen) {
      const fetchAllAssistants = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await apiClient.get('/assistants', { signal: controller.signal });
          if (!controller.signal.aborted) {
            setAllAssistants(data.filter((a: Assistant) => !existingAssistantIds.includes(a.user_id)) || []);
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          if (!controller.signal.aborted) {
            setError(err.message || '获取助教库失败');
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      };
      fetchAllAssistants();
    }

    return () => {
      controller.abort();
    };
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
    if (error) return <div className="text-destructive"><AlertTriangle /> {error}</div>;
    if (allAssistants.length === 0) return <p className="text-muted-foreground">助教库中暂无新的助教可供选择。</p>;

    return (
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="font-medium text-foreground">1. 选择一位助教</h3>
          <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
            {allAssistants.map(assistant => (
              <label key={assistant.user_id} className={`flex items-center p-2 rounded-lg cursor-pointer ${selectedAssistantId === assistant.user_id ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                <input
                  type="radio"
                  name="assistant"
                  checked={selectedAssistantId === assistant.user_id}
                  onChange={() => setSelectedAssistantId(assistant.user_id)}
                  className="h-4 w-4 text-primary border-input focus:ring-ring"
                />
                <Label className="ml-3 text-sm font-medium text-foreground">{assistant.full_name}</Label>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="font-medium text-foreground">2. 分配至班级</h3>
          <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
            {managedClasses.map(cls => (
              <label key={cls.class_id} className="flex items-center p-2 rounded-lg hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedClassIds.includes(cls.class_id)}
                  onChange={() => handleClassSelection(cls.class_id)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
                <Label className="ml-3 text-sm text-foreground">{cls.class_name}</Label>
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
    </Modal>
  );
};
