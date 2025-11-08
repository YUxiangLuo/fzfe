import React, { useState, useEffect } from 'react';
import { Edit2, User, Phone, Mail, Calendar, Loader, AlertTriangle, BookCopy, KeyRound, Save } from 'lucide-react';
import Modal from '../Common/Modal';
import { apiClient } from '../../../../utils/apiClient';
import type { User as UserType, Class as ClassType } from '../../types';
import Button from '../Common/Button';
import { validateFullName, validateEmail, validatePhone, validatePassword, validatePasswordConfirm } from '../../utils/validation';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../Common/Toast';

const PersonalInfo: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();
  const [user, setUser] = useState<UserType | null>(null);
  const [managedClasses, setManagedClasses] = useState<ClassType[]>([]);
  
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isClassesLoading, setIsClassesLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [classesError, setClassesError] = useState<string | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tempUser, setTempUser] = useState<UserType | null>(null);

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
    const fetchInitialData = async () => {
      try {
        setIsUserLoading(true);
        setUserError(null);
        const userData = await apiClient.get('/users/me');
        setUser(userData);
        setTempUser(userData);
        setIsUserLoading(false);

        if (userData && userData.user_id) {
          setIsClassesLoading(true);
          setClassesError(null);
          const classesData = await apiClient.get(`/assistants/${userData.user_id}/classes`);
          setManagedClasses(classesData || []);
          setIsClassesLoading(false);
        }
      } catch (err: any) {
        setUserError(err.message || '获取用户信息失败');
        setClassesError(err.message || '获取班级信息失败');
        setIsUserLoading(false);
        setIsClassesLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleOpenModal = () => {
    setTempUser(user);
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!tempUser) return;

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

    // 验证新密码
    const passwordValidation = validatePassword(passwordData.newPassword, { minLength: 6 });
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
    <div className="flex items-center p-6 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100">
      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mr-4">{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="font-bold text-gray-900 text-lg">{value || '未设置'}</p>
      </div>
    </div>
  );

  const renderClassesContent = () => {
    if (isClassesLoading) {
      return <div className="flex justify-center items-center p-4"><Loader className="animate-spin" /></div>;
    }
    if (classesError) {
      return <div className="text-red-500 p-4"><AlertTriangle className="inline mr-2" />{classesError}</div>;
    }
    if (managedClasses.length === 0) {
      return <p className="text-gray-500 p-4">您当前未管理任何班级。</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {managedClasses.map((cls) => (
          <div key={cls.class_id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="font-semibold text-gray-700">{cls.class_name}</p>
            <p className="text-xs text-gray-500 mt-1 font-mono bg-white inline-block px-2 py-0.5 rounded">{cls.class_code}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">个人信息管理</h1>
          <p className="text-gray-600 mt-1">管理您的个人资料和基本信息</p>
        </div>

        {isUserLoading ? (
          <div className="flex justify-center items-center h-64"><Loader className="animate-spin" /></div>
        ) : userError ? (
          <div className="text-red-500 flex flex-col items-center h-64"><AlertTriangle /><p className="mt-2">{userError}</p></div>
        ) : user && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3"><User className="w-4 h-4 text-white" /></div>
                基本信息
              </h2>
              <button onClick={handleOpenModal} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 cursor-pointer">
                <Edit2 size={16} /><span>编辑信息</span>
              </button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoItem icon={<User className="w-5 h-5 text-blue-600" />} label="姓名" value={user.full_name} />
              <InfoItem icon={<Phone className="w-5 h-5 text-green-600" />} label="手机号码" value={user.phone_number} />
              <InfoItem icon={<Mail className="w-5 h-5 text-purple-600" />} label="邮箱" value={user.email} />
              <InfoItem icon={<Calendar className="w-5 h-5 text-orange-600" />} label="注册时间" value={formatDate(user.created_at)} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="px-8 py-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3"><BookCopy className="w-4 h-4 text-white" /></div>
              管理的班级
            </h2>
          </div>
          <div className="p-8">{renderClassesContent()}</div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="px-8 py-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-t-2xl">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center mr-3"><KeyRound className="w-4 h-4 text-white" /></div>
              修改密码
            </h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
                <input type="password" name="currentPassword" autoComplete="current-password" value={passwordData.currentPassword} onChange={handlePasswordChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="请输入当前密码" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                <input type="password" name="newPassword" autoComplete="new-password" value={passwordData.newPassword} onChange={handlePasswordChange} required minLength={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="至少6个字符" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                <input type="password" name="confirmPassword" autoComplete="new-password" value={passwordData.confirmPassword} onChange={handlePasswordChange} required minLength={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="再次输入新密码" />
              </div>
            </div>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-green-600">{passwordSuccess}</p>}
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
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="编辑个人信息">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input type="text" autoComplete="name" value={tempUser.full_name} onChange={(e) => setTempUser({ ...tempUser, full_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="请输入姓名" minLength={2} maxLength={20} required />
              <p className="mt-1 text-xs text-gray-500">2-20个字符，允许中文和英文</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">手机号码（可选）</label>
              <input type="tel" autoComplete="tel" value={tempUser.phone_number || ''} onChange={(e) => setTempUser({ ...tempUser, phone_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="请输入11位手机号" pattern="1[3-9]\d{9}" />
              <p className="mt-1 text-xs text-gray-500">请输入11位中国大陆手机号</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱 <span className="text-red-500">*</span>
              </label>
              <input type="email" autoComplete="email" value={tempUser.email} onChange={(e) => setTempUser({ ...tempUser, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="example@email.com" required />
              <p className="mt-1 text-xs text-gray-500">用于接收系统通知</p>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">取消</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">保存修改</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
};

export default PersonalInfo;
