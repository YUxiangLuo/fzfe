import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/views/teacher/components/common/Modal';
import Button from '@/views/teacher/components/common/Button';
import type { User as Assistant, Class } from '@/views/teacher/types';
import { apiClient } from '@/utils/apiClient';
import { Loader, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '@/views/teacher/components/common/ConfirmDialog';
import { useConfirm } from '@/views/teacher/hooks/useConfirm';

interface ReassignAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  assistant: Assistant | null;
  managedClasses: Class[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onUnbindComplete?: (assistantId: number) => void;
}

interface ClassAssignmentStatus {
  classId: number;
  assigned: boolean;
}

export const ReassignAssistantModal: React.FC<ReassignAssistantModalProps> = ({
  isOpen,
  onClose,
  assistant,
  managedClasses,
  showToast,
  onUnbindComplete,
}) => {
  const confirm = useConfirm();
  const [assignmentStatus, setAssignmentStatus] = useState<ClassAssignmentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingClassId, setProcessingClassId] = useState<number | null>(null);

  const assistantName = assistant?.full_name || assistant?.username || '';

  const classLookup = useMemo(() => {
    const map = new Map<number, Class>();
    managedClasses.forEach(cls => map.set(cls.class_id, cls));
    return map;
  }, [managedClasses]);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!isOpen || !assistant) {
        setAssignmentStatus([]);
        setError(null);
        setProcessingClassId(null);
        setIsLoading(false);
        return;
      }

      if (managedClasses.length === 0) {
        setAssignmentStatus([]);
        setError(null);
        setProcessingClassId(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          managedClasses.map(async cls => {
            const assistantsInClass = await apiClient.get(`/classes/${cls.class_id}/assistants`);
            const assigned = Array.isArray(assistantsInClass)
              ? assistantsInClass.some((item: Assistant) => item.user_id === assistant.user_id)
              : false;
            return { classId: cls.class_id, assigned };
          })
        );
        setAssignmentStatus(results);
      } catch (err: any) {
        setError(err.message || '获取助教分配情况失败');
      } finally {
        setIsLoading(false);
        setProcessingClassId(null);
      }
    };

    fetchAssignments();
  }, [isOpen, assistant, managedClasses]);

  const handleAssign = async (classId: number) => {
    if (!assistant) return;
    const classInfo = classLookup.get(classId);
    const confirmMessage = `确认将助教"${assistantName}"绑定到班级"${classInfo?.class_name || classId}"吗？`;
    const confirmed = await confirm.showConfirm('绑定助教', confirmMessage, 'warning');
    if (!confirmed) return;

    setProcessingClassId(classId);
    try {
      await apiClient.post(`/classes/${classId}/assistants`, { assistant_id: assistant.user_id });
      setAssignmentStatus(prev =>
        prev.map(status =>
          status.classId === classId ? { ...status, assigned: true } : status
        )
      );
      showToast('绑定成功', 'success');
    } catch (err: any) {
      showToast(`绑定失败: ${err.message}`, 'error');
    } finally {
      setProcessingClassId(null);
    }
  };

  const handleUnassign = async (classId: number) => {
    if (!assistant) return;
    const classInfo = classLookup.get(classId);
    const confirmMessage = `确认解绑助教"${assistantName}"与班级"${classInfo?.class_name || classId}"的关联吗？`;
    const confirmed = await confirm.showConfirm('解绑助教', confirmMessage, 'danger');
    if (!confirmed) return;

    setProcessingClassId(classId);
    try {
      await apiClient.delete(`/classes/${classId}/assistants/${assistant.user_id}`);
      const newAssignmentStatus = assignmentStatus.map(status =>
        status.classId === classId ? { ...status, assigned: false } : status
      );
      setAssignmentStatus(newAssignmentStatus);
      showToast('解绑成功', 'success');

      // 检查是否所有班级都已解绑
      const allUnbound = newAssignmentStatus.every(status => !status.assigned);
      if (allUnbound && onUnbindComplete) {
        // 通知父组件该助教已完全解绑，可以从列表中移除
        onUnbindComplete(assistant.user_id);
      }
    } catch (err: any) {
      showToast(`解绑失败: ${err.message}`, 'error');
    } finally {
      setProcessingClassId(null);
    }
  };

  const renderContent = () => {
    if (!assistant) {
      return <p className="text-gray-500">请选择一位助教以进行重新分配。</p>;
    }

    if (managedClasses.length === 0) {
      return <p className="text-gray-500">当前没有可管理的班级。</p>;
    }

    if (isLoading) {
      return (
        <div className="flex justify-center py-10">
          <Loader className="animate-spin" />
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {managedClasses.map(cls => {
          const status = assignmentStatus.find(item => item.classId === cls.class_id);
          const isAssigned = status?.assigned ?? false;
          const isProcessing = processingClassId === cls.class_id;

          return (
            <div
              key={cls.class_id}
              className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-white"
            >
              <div className="flex items-center space-x-3">
                <div>
                  <p className="font-medium text-gray-900">{cls.class_name}</p>
                  <p className="text-xs text-gray-500">班级编号：{cls.class_code}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    isAssigned ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isAssigned ? '已绑定' : '未绑定'}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                {isAssigned ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnassign(cls.class_id)}
                    disabled={isProcessing}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {isProcessing ? '解绑中...' : '解绑'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleAssign(cls.class_id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '绑定中...' : '绑定'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="重新分配助教"
      >
        <div className="space-y-4">
          {assistant && (
            <div className="bg-blue-50 border border-blue-100 text-sm text-blue-700 rounded-lg p-3">
              <p>当前助教：<span className="font-semibold">{assistantName}</span></p>
              <p>请选择需要绑定或解绑的班级。</p>
            </div>
          )}
          {error && (
            <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
          {renderContent()}
          <div className="flex justify-end pt-4 border-gray-100">
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        variant={confirm.variant}
        onConfirm={confirm.handleConfirm}
        onCancel={confirm.handleCancel}
      />
    </>
  );
};

export default ReassignAssistantModal;
