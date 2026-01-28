import React, { useState, useEffect } from 'react';
import Modal from '@/views/teacher/components/shadcn/TeacherModal';
import Button from '@/views/teacher/components/shadcn/TeacherButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/utils/apiClient';
import { validatePassword } from '@/views/teacher/utils/validation';
import type { Student } from '@/views/teacher/types';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  student,
  showToast,
}) => {
  const [resetPasswordForm, setResetPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [resetPasswordErrors, setResetPasswordErrors] = useState({ newPassword: '', confirmPassword: '' });
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Reset form when modal opens or student changes
  useEffect(() => {
    if (isOpen) {
      setResetPasswordForm({ newPassword: '', confirmPassword: '' });
      setResetPasswordErrors({ newPassword: '', confirmPassword: '' });
    }
  }, [isOpen, student]);

  const handleResetPasswordConfirm = async () => {
    if (!student) return;

    const trimmedNewPassword = resetPasswordForm.newPassword.trim();
    const trimmedConfirm = resetPasswordForm.confirmPassword.trim();

    const newPasswordValidation = validatePassword(trimmedNewPassword, { minLength: 6, requireMixed: false });
    const newPasswordError = newPasswordValidation.valid ? '' : newPasswordValidation.error ?? '密码至少需要6位';
    const confirmError = trimmedConfirm ? (trimmedConfirm === trimmedNewPassword ? '' : '两次输入的密码不一致') : '请再次输入密码';

    setResetPasswordErrors({ newPassword: newPasswordError, confirmPassword: confirmError });

    if (newPasswordError || confirmError) {
      return;
    }

    setIsResettingPassword(true);
    try {
      await apiClient.post(`/users/${student.user_id}/reset-password`, {
        newPassword: trimmedNewPassword,
      });
      showToast(`学生 ${student.full_name} 的密码已成功更新。`, 'success');
      onClose();
    } catch (err: any) {
      showToast(`密码重置失败: ${err.message}`, 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };
  
  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="重置学生密码"
      >
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm text-primary">
            为学生
            <span className="font-semibold text-primary mx-1">
              {student?.full_name}
            </span>
            ({student?.username}) 设置新的登录密码。
          </div>
          <div>
            <Label className="text-foreground mb-2">
              新密码 <span className="text-destructive">*</span>
            </Label>
            <Input
              type="password"
              value={resetPasswordForm.newPassword}
              onChange={(e) => {
                const value = e.target.value;
                setResetPasswordForm((prev) => ({ ...prev, newPassword: value }));
                setResetPasswordErrors((prev) => ({ ...prev, newPassword: '' }));
              }}
              className="rounded-lg"
              placeholder="至少6个字符，可为纯数字"
              minLength={6}
              maxLength={20}
              disabled={isResettingPassword}
              required
            />
            {resetPasswordErrors.newPassword && (
              <p className="mt-1 text-xs text-destructive">{resetPasswordErrors.newPassword}</p>
            )}
          </div>
          <div>
            <Label className="text-foreground mb-2">
              确认新密码 <span className="text-destructive">*</span>
            </Label>
            <Input
              type="password"
              value={resetPasswordForm.confirmPassword}
              onChange={(e) => {
                const value = e.target.value;
                setResetPasswordForm((prev) => ({ ...prev, confirmPassword: value }));
                setResetPasswordErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              className="rounded-lg"
              placeholder="请再次输入新密码"
              minLength={6}
              maxLength={20}
              disabled={isResettingPassword}
              required
            />
            {resetPasswordErrors.confirmPassword && (
              <p className="mt-1 text-xs text-destructive">{resetPasswordErrors.confirmPassword}</p>
            )}
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isResettingPassword}
            >
              取消
            </Button>
            <Button
              onClick={handleResetPasswordConfirm}
              disabled={isResettingPassword}
              className="bg-primary hover:bg-primary/90"
            >
              {isResettingPassword ? '提交中...' : '确认修改'}
            </Button>
          </div>
        </div>
      </Modal>
  );
};

export default ResetPasswordModal;
