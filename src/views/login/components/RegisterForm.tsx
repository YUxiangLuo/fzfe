import React, { useState } from "react";
import { User, Lock, Mail, Phone, Eye, EyeOff, UserPlus, AlertCircle, IdCard } from "lucide-react";

interface RegisterFormProps {
  selectedRole: string;
  onSubmit: (formData: RegisterFormData) => Promise<void>;
  onBackToLogin: () => void;
  isLoading: boolean;
  error: string | null;
}

export interface RegisterFormData {
  username: string;
  name: string;
  password: string;
  email: string;
  phone?: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  selectedRole,
  onSubmit,
  onBackToLogin,
  isLoading,
  error,
}) => {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 判断是否需要显示手机号字段（教师和助教需要）
  const needsPhone = selectedRole === "teacher" || selectedRole === "assistant";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return;
    }

    const formData: RegisterFormData = {
      username: username.trim(),
      name: name.trim(),
      password,
      email: email.trim(),
    };

    if (needsPhone) {
      formData.phone = phone.trim();
    }

    await onSubmit(formData);
  };

  const isFormValid =
    username.trim() &&
    name.trim() &&
    password &&
    confirmPassword &&
    password === confirmPassword &&
    email.trim() &&
    (!needsPhone || phone.trim());

  const getRoleLabel = () => {
    const labels: Record<string, string> = {
      student: "学生",
      teacher: "教师",
      assistant: "助教",
    };
    return labels[selectedRole] || "用户";
  };

  const getUsernameLabel = () => {
    return selectedRole === "student" ? "学号" : "账号";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 错误信息提示 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* 密码不匹配提示 */}
      {password && confirmPassword && password !== confirmPassword && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 text-sm rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>两次输入的密码不一致</span>
        </div>
      )}

      {/* 用户名/学号输入 */}
      <div className="space-y-2">
        <label className="text-white/90 text-sm font-medium">{getUsernameLabel()}</label>
        <div className="relative">
          <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                     transition-all duration-300"
            placeholder={`请输入${getUsernameLabel()}`}
            required
          />
        </div>
      </div>

      {/* 姓名输入 */}
      <div className="space-y-2">
        <label className="text-white/90 text-sm font-medium">姓名</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                     transition-all duration-300"
            placeholder="请输入姓名"
            required
          />
        </div>
      </div>

      {/* 邮箱输入 */}
      <div className="space-y-2">
        <label className="text-white/90 text-sm font-medium">邮箱</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                     transition-all duration-300"
            placeholder="请输入邮箱地址"
            required
          />
        </div>
      </div>

      {/* 手机号输入（仅教师和助教） */}
      {needsPhone && (
        <div className="space-y-2">
          <label className="text-white/90 text-sm font-medium">手机号</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg
                       text-white placeholder-white/50 backdrop-blur-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                       transition-all duration-300"
              placeholder="请输入手机号"
              required
            />
          </div>
        </div>
      )}

      {/* 密码输入 */}
      <div className="space-y-2">
        <label className="text-white/90 text-sm font-medium">密码</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-12 py-2.5 bg-white/10 border border-white/20 rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                     transition-all duration-300"
            placeholder="请输入密码"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* 确认密码输入 */}
      <div className="space-y-2">
        <label className="text-white/90 text-sm font-medium">确认密码</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full pl-10 pr-12 py-2.5 bg-white/10 border border-white/20 rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                     transition-all duration-300"
            placeholder="请再次输入密码"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* 注册按钮 */}
      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        className={`
          w-full py-3 px-6 rounded-lg font-medium text-white
          transition-all duration-300 flex items-center justify-center space-x-2
          ${
            isFormValid && !isLoading
              ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 shadow-lg hover:shadow-xl"
              : "bg-white/20 cursor-not-allowed"
          }
        `}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            <span>注册中...</span>
          </>
        ) : (
          <>
            <UserPlus className="w-5 h-5" />
            <span>注册{getRoleLabel()}账号</span>
          </>
        )}
      </button>

      {/* 返回登录按钮 */}
      <div className="text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-blue-300 hover:text-blue-200 text-sm transition-colors underline"
        >
          已有账号？返回登录
        </button>
      </div>
    </form>
  );
};
