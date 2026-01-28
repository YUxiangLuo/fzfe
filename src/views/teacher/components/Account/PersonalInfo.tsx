import React, { useState, useEffect, useCallback } from 'react';
import { Edit2, User, Phone, Mail, Calendar, Loader, AlertTriangle, BookCopy, KeyRound, Save } from 'lucide-react';
import Modal from '@/views/teacher/components/shadcn/TeacherModal';
import { apiClient } from '@/utils/apiClient';
import type { User as UserType, Class as ClassType } from '@/views/teacher/types';
import Button from '@/views/teacher/components/shadcn/TeacherButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateFullName, validateEmail, validatePhone, validatePassword, validatePasswordConfirm } from '@/views/teacher/utils/validation';
import { useToast } from '@/views/teacher/hooks/useToast';
import { UI_CONSTANTS } from '@/views/teacher/constants/ui';

const PersonalInfo: React.FC = () => {
  const { showToast } = useToast();
  const [user, setUser] = useState<UserType | null>(null);
  const [managedClasses, setManagedClasses] = useState<ClassType[]>([]);
  
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isClassesLoading, setIsClassesLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [classesError, setClassesError] = useState<string | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tempUser, setTempUser] = useState<UserType | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const formatDate = (value: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchInitialData = async () => {
      let userData: any;
      try {
        setIsUserLoading(true);
        setUserError(null);
        userData = await apiClient.get('/users/me', { signal: controller.signal });

        if (!controller.signal.aborted) {
          setUser(userData);
          setTempUser(userData);
          setIsUserLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;

        if (!controller.signal.aborted) {
          setUserError(err.message || '获取用户信息失败');
          setIsUserLoading(false);
        }
        return;
      }

      if (userData && userData.user_id && !controller.signal.aborted) {
        try {
          setIsClassesLoading(true);
          setClassesError(null);
          const classesData = await apiClient.get(`/teachers/${userData.user_id}/classes`, { signal: controller.signal });

          if (!controller.signal.aborted) {
            setManagedClasses(classesData || []);
            setIsClassesLoading(false);
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;

          if (!controller.signal.aborted) {
            setClassesError(err.message || '获取班级信息失败');
            setIsClassesLoading(false);
          }
        }
      }
    };

    fetchInitialData();

    return () => {
      controller.abort();
    };
  }, []);

  const handleOpenModal = useCallback(() => {
    setTempUser(user);
    setIsEditModalOpen(true);
  }, [user]);

  const handleCloseModal = useCallback(() => {
    setIsEditModalOpen(false);
    setIsSaving(false);
  }, []);

  const handleSave = async () => {
    if (!tempUser) return;

    // 防止重复提交
    if (isSaving) return;

    // 验证姓名
    const nameValidation = validateFullName(tempUser.full_name);
    if (!nameValidation.valid) {
      showToast(nameValidation.error || '姓名格式不正确', 'error');
      return;
    }

    // 验证手机号（可选）
    if (tempUser.phone_number) {
      const phoneValidation = validatePhone(tempUser.phone_number, false);
      if (!phoneValidation.valid) {
        showToast(phoneValidation.error || '手机号格式不正确', 'error');
        return;
      }
    }

    // 验证邮箱
    const emailValidation = validateEmail(tempUser.email, true);
    if (!emailValidation.valid) {
      showToast(emailValidation.error || '邮箱格式不正确', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await apiClient.put('/users/me', {
        full_name: tempUser.full_name.trim(),
        phone_number: tempUser.phone_number?.trim() || null,
        email: tempUser.email.trim(),
      });

      setUser(updatedUser);
      setIsEditModalOpen(false);

      showToast('个人信息保存成功', 'success');
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('保存失败，请稍后重试', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // 验证当前密码
    if (!passwordData.currentPassword) {
      setPasswordError('请输入当前密码');
      return;
    }

    // P2-1: 验证新密码 - 使用常量
    const passwordValidation = validatePassword(passwordData.newPassword, {
      minLength: UI_CONSTANTS.PASSWORD_MIN_LENGTH
    });
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error);
      return;
    }

    // 验证密码确认
    const confirmValidation = validatePasswordConfirm(passwordData.newPassword, passwordData.confirmPassword);
    if (!confirmValidation.valid) {
      setPasswordError(confirmValidation.error);
      return;
    }

    setIsSavingPassword(true);
    try {
      await apiClient.put('/users/me/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordSuccess('密码修改成功！');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      if (err && err.message && err.message.includes('Invalid current password')) {
        setPasswordError('当前密码不正确，请重新输入。');
      } else {
        setPasswordError(err.message || '密码修改失败，请稍后重试。');
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | null }) => (
    <div className="flex items-center p-6 bg-muted/50 rounded-2xl border border-border">
      <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center mr-4">{icon}</div>
      <div>
        <Label className="text-muted-foreground">{label}</Label>
        <p className="font-bold text-foreground text-lg">{value || '未设置'}</p>
      </div>
    </div>
  );

  const renderClassesContent = () => {
    if (isClassesLoading) {
      return <div className="flex justify-center items-center p-4"><Loader className="animate-spin" /></div>;
    }
    if (classesError) {
      return <div className="text-destructive p-4"><AlertTriangle className="inline mr-2" />{classesError}</div>;
    }
    if (managedClasses.length === 0) {
      return <p className="text-muted-foreground p-4">您当前未管理任何班级。</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {managedClasses.map((cls) => (
          <div key={cls.class_id} className="bg-muted p-4 rounded-xl border border-border">
            <p className="font-semibold text-foreground">{cls.class_name}</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono bg-card inline-block px-2 py-0.5 rounded">{cls.class_code}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold bg-foreground bg-clip-text text-transparent">个人信息管理</h1>
          <p className="text-muted-foreground mt-1">管理您的个人资料和基本信息</p>
        </div>

        {isUserLoading ? (
          <div className="flex justify-center items-center h-64"><Loader className="animate-spin" /></div>
        ) : userError ? (
          <div className="text-destructive flex flex-col items-center h-64"><AlertTriangle /><p className="mt-2">{userError}</p></div>
        ) : user && (
          <div className="bg-card rounded-2xl shadow-xl border border-border">
            <div className="flex items-center justify-between px-8 py-6 bg-primary/10 rounded-t-2xl">
              <h2 className="text-xl font-bold text-foreground flex items-center">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3"><User className="w-4 h-4 text-primary-foreground" /></div>
                基本信息
              </h2>
              <Button
                variant="outline"
                onClick={handleOpenModal}
                className="text-primary border-primary/20 hover:bg-primary/10"
              >
                <Edit2 size={16} /><span>编辑信息</span>
              </Button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoItem icon={<User className="w-5 h-5 text-primary" />} label="姓名" value={user.full_name} />
              <InfoItem icon={<Phone className="w-5 h-5 text-success" />} label="手机号码" value={user.phone_number} />
              <InfoItem icon={<Mail className="w-5 h-5 text-accent-foreground" />} label="邮箱" value={user.email} />
              <InfoItem icon={<Calendar className="w-5 h-5 text-warning" />} label="注册时间" value={formatDate(user.created_at)} />
            </div>
          </div>
        )}

        <div className="bg-card rounded-2xl shadow-xl border border-border">
          <div className="px-8 py-6 bg-success/10 rounded-t-2xl">
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <div className="w-8 h-8 bg-success rounded-lg flex items-center justify-center mr-3"><BookCopy className="w-4 h-4 text-primary-foreground" /></div>
              管理的班级
            </h2>
          </div>
          <div className="p-8">{renderClassesContent()}</div>
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border">
          <div className="px-8 py-6 bg-destructive/10 rounded-t-2xl">
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <div className="w-8 h-8 bg-destructive rounded-lg flex items-center justify-center mr-3"><KeyRound className="w-4 h-4 text-primary-foreground" /></div>
              修改密码
            </h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label className="text-foreground mb-2">当前密码</Label>
                <Input type="password" name="currentPassword" autoComplete="current-password" value={passwordData.currentPassword} onChange={handlePasswordChange} required className="rounded-lg" placeholder="请输入当前密码" />
              </div>
              <div>
                <Label className="text-foreground mb-2">新密码</Label>
                <Input type="password" name="newPassword" autoComplete="new-password" value={passwordData.newPassword} onChange={handlePasswordChange} required minLength={UI_CONSTANTS.PASSWORD_MIN_LENGTH} className="rounded-lg" placeholder={`至少${UI_CONSTANTS.PASSWORD_MIN_LENGTH}个字符`} />
              </div>
              <div>
                <Label className="text-foreground mb-2">确认新密码</Label>
                <Input type="password" name="confirmPassword" autoComplete="new-password" value={passwordData.confirmPassword} onChange={handlePasswordChange} required minLength={UI_CONSTANTS.PASSWORD_MIN_LENGTH} className="rounded-lg" placeholder="再次输入新密码" />
              </div>
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-success">{passwordSuccess}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingPassword}>
                <Save size={16} className="mr-2" />
                {isSavingPassword ? '保存中...' : '保存新密码'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {tempUser && (
        <Modal isOpen={isEditModalOpen} onClose={handleCloseModal} title="编辑个人信息">
          <div className="space-y-4">
            <div>
              <Label className="text-foreground mb-2">
                姓名 <span className="text-destructive">*</span>
              </Label>
              <Input type="text" autoComplete="name" value={tempUser.full_name} onChange={(e) => setTempUser({ ...tempUser, full_name: e.target.value })} className="rounded-lg" placeholder="请输入姓名" minLength={2} maxLength={20} required />
              <p className="mt-1 text-xs text-muted-foreground">2-20个字符，允许中文和英文</p>
            </div>
            <div>
              <Label className="text-foreground mb-2">手机号码（可选）</Label>
              <Input type="tel" autoComplete="tel" value={tempUser.phone_number || ''} onChange={(e) => setTempUser({ ...tempUser, phone_number: e.target.value })} className="rounded-lg" placeholder="请输入11位手机号" pattern="1[3-9]\d{9}" />
              <p className="mt-1 text-xs text-muted-foreground">请输入11位中国大陆手机号</p>
            </div>
            <div>
              <Label className="text-foreground mb-2">
                邮箱 <span className="text-destructive">*</span>
              </Label>
              <Input type="email" autoComplete="email" value={tempUser.email} onChange={(e) => setTempUser({ ...tempUser, email: e.target.value })} className="rounded-lg" placeholder="example@email.com" required />
              <p className="mt-1 text-xs text-muted-foreground">用于接收系统通知</p>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={handleCloseModal} disabled={isSaving} className="text-muted-foreground">
                取消
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? '保存中...' : '保存修改'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      
    </>
  );
};

export default PersonalInfo;
