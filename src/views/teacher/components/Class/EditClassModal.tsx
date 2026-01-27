import React, { useState, useEffect } from 'react';
import type { Class } from '@/views/teacher/types';
import Modal from '@/views/teacher/components/common/Modal';
import Button from '@/views/teacher/components/common/Button';
import { Toast } from '@/views/teacher/components/common/Toast';
import { validateClassName, validateClassCode } from '@/views/teacher/utils/validation';
import { useToast } from '@/views/teacher/hooks/useToast';

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: Class | null;
  onSubmit: (classId: number, payload: { class_name: string; class_code: string }) => Promise<void>;
}

export const EditClassModal: React.FC<EditClassModalProps> = ({ isOpen, onClose, classData, onSubmit }) => {
  const { toast, showToast, hideToast } = useToast();
  const [formData, setFormData] = useState({ class_name: '', class_code: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (classData) {
      setFormData({
        class_name: classData.class_name,
        class_code: classData.class_code || '',
      });
    }
  }, [classData]);

  const handleUpdate = async () => {
    if (!classData) return;

    const nameValidation = validateClassName(formData.class_name);
    if (!nameValidation.valid) {
      showToast(nameValidation.error || '班级名称格式不正确', 'error');
      return;
    }
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
      await onSubmit(classData.class_id, payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    <Modal isOpen={isOpen} onClose={onClose} title="修改班级信息">
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
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleUpdate} disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
    </>
  );
};
