import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useExperiment } from "../contexts/ExperimentContext.zustand";
import { apiClient } from "../../../utils/apiClient";
import {
  User,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  School,
  Loader2,
  X,
  MapPin,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Save,
} from "lucide-react";
import { getRoleByBackendValue } from "../../../config/roles";

const TOTAL_EXPERIMENT_STEPS = 7;
const MIN_PASSWORD_LENGTH = 6;

interface UserClassInfo {
  class_id: number;
  class_name: string;
  class_code: string;
  teacher_id: number;
  teacher_name: string;
}

interface UserProfileResponse {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: string;
  created_at: string;
  class?: UserClassInfo | null;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state: experimentState } = useExperiment();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<UserProfileResponse>("/users/me");
        if (!active) return;
        setProfile(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "获取个人信息失败");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      active = false;
    };
  }, []);

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
    if (!passwordData.newPassword || passwordData.newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`新密码长度不能少于${MIN_PASSWORD_LENGTH}位。`);
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '密码修改失败，请稍后重试。';
      if (errorMessage.includes('Invalid current password')) {
        setPasswordError('当前密码不正确，请重新输入。');
      } else {
        setPasswordError(errorMessage);
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  // 计算返回路径
  const fromState = location.state as { from?: string } | null;
  const fromPath = fromState?.from;
  const isFromProfile = fromPath?.startsWith("/profile");
  const returnPath = fromPath && !isFromProfile ? fromPath : "/industry";

  const isExperimentOngoing =
    experimentState.status !== "Not Started" ||
    experimentState.highest_completed_step > 0 ||
    experimentState.current_step > 1;

  const handleExit = () => {
    navigate(returnPath, { replace: !isFromProfile });
  };

  const roleLabel = profile?.role
    ? getRoleByBackendValue(profile.role)?.displayName ?? profile.role
    : "—";

  const createdDate = profile
    ? new Date(profile.created_at).toLocaleString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const primaryActionLabel = isExperimentOngoing ? "返回实验" : "进入实验";
  const PrimaryIcon = isExperimentOngoing ? ArrowLeft : ArrowRight;

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <button
        onClick={handleExit}
        className="absolute top-6 right-6 p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-md rounded-lg transition-all z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="h-full flex flex-col overflow-y-auto">
        <div className="bg-white border-b border-gray-200 px-8 pt-10 pb-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              个人信息
            </h1>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-6xl mx-auto w-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                正在加载个人信息...
              </div>
            ) : error ? (
              <div className="bg-white border border-red-200 rounded-2xl p-8 text-center text-red-600 shadow-sm">
                <p className="text-lg font-semibold mb-2">信息获取失败</p>
                <p>{error}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <div className="text-center mb-8">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <User className="w-12 h-12 text-white" />
                      </div>
                      <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                        {profile?.full_name ?? "—"}
                      </h2>
                      <p className="text-gray-600 text-lg">{roleLabel}</p>
                    </div>

                    <div className="space-y-5">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">邮箱</div>
                          <div className="font-medium text-gray-900 break-all">
                            {profile?.email ?? "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Phone className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">联系电话</div>
                          <div className="font-medium text-gray-900">
                            {profile?.phone_number ?? "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">
                            账号创建时间
                          </div>
                          <div className="font-medium text-gray-900">
                            {createdDate}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">用户名</div>
                          <div className="font-medium text-gray-900">
                            {profile?.username ?? "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <School className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900">
                          班级信息
                        </h3>
                        <p className="text-gray-500">
                          查看当前所属班级与指导教师信息
                        </p>
                      </div>
                    </div>

                    {profile?.class ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <div className="text-sm text-gray-500 mb-1">
                              班级名称
                            </div>
                            <div className="font-semibold text-gray-900">
                              {profile.class.class_name}
                            </div>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <div className="text-sm text-gray-500 mb-1">
                              班级编码
                            </div>
                            <div className="font-semibold text-gray-900">
                              {profile.class.class_code}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <div className="text-sm text-gray-500 mb-1">
                              指导教师
                            </div>
                            <div className="font-semibold text-gray-900 flex items-center space-x-2">
                              <User className="w-4 h-4 text-blue-600" />
                              <span>{profile.class.teacher_name}</span>
                            </div>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <div className="text-sm text-gray-500 mb-1">
                              教师编号
                            </div>
                            <div className="font-semibold text-gray-900">
                              {profile.class.teacher_id}
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-center space-x-3">
                          <MapPin className="w-5 h-5 text-blue-600" />
                          <p className="text-sm text-blue-800">
                            若班级信息有误，请联系指导教师及时更新。
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-yellow-800">
                        暂未关联班级信息，请联系管理员或指导教师确认。
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        实验进度概览
                      </h3>
                      <span className="text-sm text-gray-500">
                        当前解锁步骤：{experimentState.current_step} / {TOTAL_EXPERIMENT_STEPS}
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">最高完成步骤</span>
                        <span className="font-medium text-gray-900">
                          {experimentState.highest_completed_step}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(experimentState.highest_completed_step / TOTAL_EXPERIMENT_STEPS, 1) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        进度统计基于当前会话。实际完成情况以后台记录为准。
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <KeyRound className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900">
                          修改密码
                        </h3>
                        <p className="text-gray-500">
                          定期修改密码以保证账户安全
                        </p>
                      </div>
                    </div>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            当前密码
                          </label>
                          <input
                            type="password"
                            name="currentPassword"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            新密码
                          </label>
                          <input
                            type="password"
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            required
                            minLength={MIN_PASSWORD_LENGTH}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            确认新密码
                          </label>
                          <input
                            type="password"
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            required
                            minLength={MIN_PASSWORD_LENGTH}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                          />
                        </div>
                      </div>
                      {passwordError && (
                        <p className="text-sm text-red-600">{passwordError}</p>
                      )}
                      {passwordSuccess && (
                        <p className="text-sm text-green-600">{passwordSuccess}</p>
                      )}
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={isSavingPassword}
                          className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save size={16} />
                          <span>{isSavingPassword ? '保存中...' : '保存新密码'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border-t border-gray-200 px-8 py-6">
          <div className="max-w-6xl mx-auto flex justify-center">
            <button
              onClick={handleExit}
              className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
            >
              <PrimaryIcon className="w-5 h-5" />
              <span>{primaryActionLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
