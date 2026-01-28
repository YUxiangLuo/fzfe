import React, { useState, useMemo, useCallback } from 'react';
import Modal from '@/views/teacher/components/shadcn/TeacherModal';
import Button from '@/views/teacher/components/shadcn/TeacherButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateUsername, validateFullName, validateEmail, validatePhone, validatePassword } from '@/views/teacher/utils/validation';
import { UI_CONSTANTS } from '@/views/teacher/constants/ui';
import type { Class } from '@/views/teacher/types';
import { apiClient } from '@/utils/apiClient';

interface CreateAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  managedClasses: Class[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onSuccess: (newAssistant: any) => void;
}

const CreateAssistantModal: React.FC<CreateAssistantModalProps> = ({
  isOpen,
  onClose,
  managedClasses,
  showToast,
  onSuccess
}) => {
  const INITIAL_ASSISTANT = useMemo(() => ({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone_number: '',
  }), []);

  const [newAssistant, setNewAssistant] = useState(INITIAL_ASSISTANT);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setNewAssistant(INITIAL_ASSISTANT);
      setSelectedClassIds([]);
      setIsSubmitting(false);
    }
  }, [isOpen, INITIAL_ASSISTANT]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAssistant(prev => ({ ...prev, [name]: value }));
  };

  const handleClassSelection = (classId: number) => {
    setSelectedClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const handleCreateAssistant = async () => {
    // 防止重复提交
    if (isSubmitting) return;

    // 验证用户名
    const usernameValidation = validateUsername(newAssistant.username);
    if (!usernameValidation.valid) {
      showToast(usernameValidation.error || '用户名验证失败', 'error');
      return;
    }

    // 验证姓名
    const nameValidation = validateFullName(newAssistant.full_name);
    if (!nameValidation.valid) {
      showToast(nameValidation.error || '姓名验证失败', 'error');
      return;
    }

    // 验证密码
    const passwordValidation = validatePassword(newAssistant.password, {
      minLength: UI_CONSTANTS.PASSWORD_MIN_LENGTH
    });
    if (!passwordValidation.valid) {
      showToast(passwordValidation.error || '密码验证失败', 'error');
      return;
    }

    // 验证邮箱
    const emailValidation = validateEmail(newAssistant.email, true);
    if (!emailValidation.valid) {
      showToast(emailValidation.error || '邮箱验证失败', 'error');
      return;
    }

    // 验证手机号（必填）
    const phoneValidation = validatePhone(newAssistant.phone_number, true);
    if (!phoneValidation.valid) {
      showToast(phoneValidation.error || '手机号验证失败', 'error');
      return;
    }

    // 验证班级选择
    if (selectedClassIds.length === 0) {
      showToast('请至少选择一个班级', 'error');
      return;
    }

    setIsSubmitting(true);
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
      onSuccess(createdAssistant);
      onClose();
    } catch (err: any) {
      showToast(`创建失败: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="创建新助教">
        <div className="space-y-4">
          <div>
          <Label className="text-foreground mb-2">
            姓名 <span className="text-destructive">*</span>
          </Label>
          <Input name="full_name" value={newAssistant.full_name} onChange={handleInputChange} placeholder="例如：张老师" className="rounded-lg" minLength={2} maxLength={20} required />
          <p className="mt-1 text-xs text-muted-foreground">2-20个字符，允许中文和英文</p>
        </div>
        <div>
          <Label className="text-foreground mb-2">
            用户名 <span className="text-destructive">*</span>
          </Label>
          <Input name="username" value={newAssistant.username} onChange={handleInputChange} placeholder="例如：zhang_assistant" className="rounded-lg" minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" required />
          <p className="mt-1 text-xs text-muted-foreground">3-20个字符，只能包含英文、数字和下划线</p>
        </div>
        <div>
          <Label className="text-foreground mb-2">
            初始密码 <span className="text-destructive">*</span>
          </Label>
          <Input name="password" type="password" value={newAssistant.password} onChange={handleInputChange} placeholder={`至少${UI_CONSTANTS.PASSWORD_MIN_LENGTH}个字符`} className="rounded-lg" minLength={UI_CONSTANTS.PASSWORD_MIN_LENGTH} maxLength={UI_CONSTANTS.PASSWORD_MAX_LENGTH} required />
          <p className="mt-1 text-xs text-muted-foreground">{UI_CONSTANTS.PASSWORD_MIN_LENGTH}-{UI_CONSTANTS.PASSWORD_MAX_LENGTH}个字符</p>
        </div>
        <div>
          <Label className="text-foreground mb-2">
            邮箱 <span className="text-destructive">*</span>
          </Label>
          <Input name="email" type="email" value={newAssistant.email} onChange={handleInputChange} placeholder="example@email.com" className="rounded-lg" required />
          <p className="mt-1 text-xs text-muted-foreground">用于接收系统通知</p>
        </div>
        <div>
          <Label className="text-foreground mb-2">
            手机号 <span className="text-destructive">*</span>
          </Label>
          <Input
            name="phone_number"
            type="tel"
            value={newAssistant.phone_number}
            onChange={handleInputChange}
            placeholder="请输入11位手机号"
            className="rounded-lg"
            pattern="1[3-9]\d{9}"
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">请输入11位中国大陆手机号</p>
        </div>

        <div>
          <Label className="text-foreground mb-2">分配班级</Label>
          <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
            {managedClasses.map(cls => (
              <div key={cls.class_id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`create-cls-${cls.class_id}`}
                  checked={selectedClassIds.includes(cls.class_id)}
                  onChange={() => handleClassSelection(cls.class_id)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
                <Label htmlFor={`create-cls-${cls.class_id}`} className="ml-3 text-sm text-foreground">{cls.class_name}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>取消</Button>
          <Button onClick={handleCreateAssistant} disabled={isSubmitting}>
            {isSubmitting ? '创建中...' : '创建'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateAssistantModal;
