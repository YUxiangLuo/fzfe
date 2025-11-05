import React, { useState } from "react";
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";

interface LoginFormProps {
  selectedRole: string;
  onSubmit: (username: string, password: string) => Promise<void>;
  onSwitchToRegister?: () => void;
  isLoading: boolean;
  error: string | null;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  selectedRole,
  onSubmit,
  onSwitchToRegister,
  isLoading,
  error,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !selectedRole) return;
    await onSubmit(username, password);
  };

  const isFormValid = username.trim() && password.trim() && selectedRole;

  // 根据角色获取用户名字段的标签
  const getUsernameLabel = () => {
    return selectedRole === "student" ? "学号" : "用户名";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 错误信息提示 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* 用户名输入 */}
      <div className="space-y-2">
        <label className="text-white/90 text-sm font-medium">{getUsernameLabel()}</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                     transition-all duration-300"
            placeholder={`请输入${getUsernameLabel()}`}
            required
          />
        </div>
      </div>

      {/* 密码输入 */}
      <div className="space-y-2">
        <label className="text-white/90 text-sm font-medium">密码</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg
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

      {/* 登录按钮 */}
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
            <span>登录中...</span>
          </>
        ) : (
          <>
            <LogIn className="w-5 h-5" />
            <span>登录系统</span>
          </>
        )}
      </button>

      {/* 注册链接（仅学生、教师、助教显示） */}
      {onSwitchToRegister && selectedRole !== "admin" && (
        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-300 hover:text-blue-200 text-sm transition-colors underline"
          >
            还没有账号？立即注册
          </button>
        </div>
      )}
    </form>
  );
};
