import React, { useState, useCallback, useRef } from 'react';
import { Plus } from 'lucide-react';
import type { Class, Student } from '@/views/teacher/types';
import Button from '@/views/teacher/components/shadcn/TeacherButton';
import { apiClient } from '@/utils/apiClient';
import { useToast } from '@/views/teacher/hooks/useToast';
import { useConfirm } from '@/views/teacher/hooks/useConfirm';
import { ConfirmDialog } from '@/views/teacher/components/shadcn/TeacherConfirmDialog';
import { useClasses } from '@/views/teacher/hooks/useClasses';
import { useRole } from '@/views/teacher/contexts/RoleContext';

import { ClassesTable } from './ClassesTable';
import { CreateClassModal } from './CreateClassModal';
import { EditClassModal } from './EditClassModal';
import { ViewStudentsModal } from './ViewStudentsModal';
import { CreateResultModal } from './CreateResultModal';

interface CreateClassResponse {
  class: Class;
  students_created: number;
  students_enrolled: number;
  students: Student[];
  errors: string[];
}

const ClassManagement: React.FC = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { role } = useRole();
  const { classes, isLoading, error, addClass, updateClass, deleteClass } = useClasses();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  
  const [createResult, setCreateResult] = useState<CreateClassResponse | null>(null);
  const studentsRequestRef = useRef<number | null>(null);

  const handleCreateSubmit = async (formDataToSend: FormData) => {
    try {
      const result = await apiClient.postFormData<CreateClassResponse>('/classes', formDataToSend);
      addClass({ ...result.class, assistants: [] });
      setCreateResult(result);
      setShowCreateModal(false);
      setShowResultModal(true);
      showToast('班级创建成功', 'success');
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('操作失败，请稍后重试', 'error');
      }
      // Re-throw to allow the modal to handle its submitting state
      throw err;
    }
  };

  const handleUpdateSubmit = async (classId: number, payload: { class_name: string; class_code: string }) => {
    if (!selectedClass) {
      showToast('未选择要编辑的班级', 'error');
      return;
    }
    try {
      const updatedClassData = await apiClient.put<Class>(`/classes/${classId}`, payload);
      updateClass({ ...selectedClass, ...updatedClassData });
      setShowEditModal(false);
      setSelectedClass(null);
      showToast('班级信息更新成功', 'success');
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('操作失败，请稍后重试', 'error');
      }
      // Re-throw to allow the modal to handle its submitting state
      throw err;
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
      deleteClass(classItem.class_id);
      if (selectedClass && selectedClass.class_id === classItem.class_id) {
        setShowEditModal(false);
        setShowStudentsModal(false);
        setSelectedClass(null);
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
    const requestId = classItem.class_id;
    studentsRequestRef.current = requestId;

    setSelectedClass(classItem);
    setShowStudentsModal(true);
    setStudents([]);
    setStudentsError(null);
    setIsStudentsLoading(true);

    try {
      const response = await apiClient.get(`/classes/${classItem.class_id}`);
      if (studentsRequestRef.current !== requestId) return;
      setStudents(response.students || []);
    } catch (err: any) {
      if (studentsRequestRef.current !== requestId) return;
      setStudentsError(err.message || '获取学生列表失败');
    } finally {
      if (studentsRequestRef.current === requestId) {
        setIsStudentsLoading(false);
      }
    }
  };

  const handleOpenEdit = (classItem: Class) => {
    setSelectedClass(classItem);
    setShowEditModal(true);
  };
  
  const handleCloseResultModal = useCallback(() => {
    setShowResultModal(false);
    setCreateResult(null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">班级管理</h1>
        {role?.id === 'teacher' && (
          <div className="flex space-x-3">
            <Button onClick={() => setShowCreateModal(true)} className="bg-primary hover:bg-primary/90">
              <Plus size={16} className="mr-2" />
              新增班级
            </Button>
          </div>
        )}
      </div>

      <ClassesTable
        classes={classes}
        isLoading={isLoading}
        error={error}
        onViewStudents={handleViewStudents}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <CreateClassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
      />

      <EditClassModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        classData={selectedClass}
        onSubmit={handleUpdateSubmit}
      />

      <ViewStudentsModal
        isOpen={showStudentsModal}
        onClose={() => setShowStudentsModal(false)}
        selectedClass={selectedClass}
        students={students}
        isLoading={isStudentsLoading}
        error={studentsError}
      />
      
      <CreateResultModal
        isOpen={showResultModal}
        onClose={handleCloseResultModal}
        result={createResult}
      />

      

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