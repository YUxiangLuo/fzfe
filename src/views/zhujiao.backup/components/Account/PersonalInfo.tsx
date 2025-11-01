import React, { useState, useEffect } from 'react';
import { Edit2, User, Phone, Mail, Calendar, Loader, AlertTriangle, BookCopy, KeyRound, Save } from 'lucide-react';
import Modal from '../Common/Modal';
import { apiClient } from '../../../../utils/apiClient';
import type { User as UserType, Class as ClassType } from '../../types';
import Button from '../Common/Button';

const PersonalInfo: React.FC = () => {
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
    try {
      const updatedUser = await apiClient.put('/users/me', {
        full_name: tempUser.full_name,
        phone_number: tempUser.phone_number,
        email: tempUser.email,
      });
      setUser(updatedUser);
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert(`保存失败: ${err.message}`);
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

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('新密码和确认密码不匹配。');
      return;
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setPasswordError('新密码长度不能少于6位。');
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
              <InfoItem icon={<Calendar className="w-5 h-5 text-orange-600" />} label="注册时间" value={new Date(user.created_at).toLocaleDateString()} />
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
                <input type="text" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                <input type="text" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                <input type="text" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
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
              <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
              <input type="text" value={tempUser.full_name} onChange={(e) => setTempUser({ ...tempUser, full_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">手机号码</label>
              <input type="text" value={tempUser.phone_number || ''} onChange={(e) => setTempUser({ ...tempUser, phone_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
              <input type="email" value={tempUser.email} onChange={(e) => setTempUser({ ...tempUser, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">取消</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">保存修改</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PersonalInfo;
