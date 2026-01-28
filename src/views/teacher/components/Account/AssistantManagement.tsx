import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Loader, AlertTriangle, UserPlus, RefreshCw } from 'lucide-react';
import type { User as Assistant, Class } from '@/views/teacher/types';
import Modal from '@/views/teacher/components/shadcn/TeacherModal';
import Button from '@/views/teacher/components/shadcn/TeacherButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/utils/apiClient';
import { decodeToken } from '@/utils/auth';
import { SelectAssistantModal } from './SelectAssistantModal';
import { ReassignAssistantModal } from './ReassignAssistantModal';
import CreateAssistantModal from './CreateAssistantModal';
import { validateUsername, validateFullName, validateEmail, validatePhone, validatePassword } from '@/views/teacher/utils/validation';
import { useToast } from '@/views/teacher/hooks/useToast';
import { UI_CONSTANTS } from '@/views/teacher/constants/ui';

const AssistantManagement: React.FC = () => {
  const { showToast } = useToast();
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
  
  const resetCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleCreateSuccess = (newAssistant: Assistant) => {
    setAssistants(prev => [newAssistant, ...prev]);
    showToast('助教创建成功', 'success');
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
  if (error) return <div className="text-destructive"><AlertTriangle /> {error}</div>;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">助教管理</h1>
          <div className="flex space-x-3">
            <Button onClick={() => setShowCreateModal(true)} className="bg-primary hover:bg-primary/90">
              <Plus size={16} className="mr-2" />
              创建助教
            </Button>
            <Button onClick={() => setShowSelectModal(true)} variant="outline">
              <UserPlus size={16} className="mr-2" />
              从库中选择
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md overflow-hidden">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">姓名</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">用户名</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">手机号</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">邮箱</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card">
              {assistants.map(assistant => (
                <TableRow key={assistant.user_id}>
                  <TableCell className="px-6 py-4 text-sm font-medium">{assistant.full_name}</TableCell>
                  <TableCell className="px-6 py-4 text-sm">{assistant.username}</TableCell>
                  <TableCell className="px-6 py-4 text-sm">{assistant.phone_number || '-'}</TableCell>
                  <TableCell className="px-6 py-4 text-sm">{assistant.email}</TableCell>
                  <TableCell className="px-6 py-4">
                    <Button
                      variant="outline"
                      onClick={() => openReassignModal(assistant)}
                      className="text-primary border-primary/20 hover:bg-primary/10"
                    >
                      <RefreshCw size={16} className="mr-2" />重新分配
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
      
      <CreateAssistantModal
        isOpen={showCreateModal}
        onClose={resetCreateModal}
        managedClasses={managedClasses}
        showToast={showToast}
        onSuccess={handleCreateSuccess}
      />

      
    </>
  );
};

export default AssistantManagement;
