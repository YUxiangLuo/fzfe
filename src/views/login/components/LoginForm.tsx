import React, { useState, useCallback, useRef, useEffect } from "react";
import { User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { ErrorAlert } from "./ErrorAlert";
import { validateUsername } from "../utils/registerValidation";

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
  const [validationError, setValidationError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // 根据角色获取用户名字段的标签
  const getUsernameLabel = () => {
    return selectedRole === "student" ? "学号" : "用户名";
  };

  // 验证用户名格式（使用与注册表单相同的验证逻辑）
  const validateUsernameInput = useCallback((value: string, role: string): string => {
    if (!value.trim()) {
      return "";
    }
    const result = validateUsername(value, role);
    return result.error;
  }, []);

  // 处理用户名输入
  const handleUsernameChange = useCallback((value: string) => {
    setUsername(value);
    const error = validateUsernameInput(value, selectedRole);
    setValidationError(error);
  }, [selectedRole, validateUsernameInput]);

  // 登录失败后清空密码并聚焦
  useEffect(() => {
    if (error) {
      setPassword("");
      setIsSubmitting(false);
      // 延迟聚焦，确保 DOM 更新完成
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [error]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // 防止重复提交
    if (isSubmitting || isLoading) {
      return;
    }

    // 验证表单
    if (!username.trim() || !password.trim() || !selectedRole) {
      return;
    }

    // 验证用户名格式
    const usernameError = validateUsernameInput(username, selectedRole);
    if (usernameError) {
      setValidationError(usernameError);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(username, password);
    } finally {
      setIsSubmitting(false);
    }
  }, [username, password, selectedRole, isSubmitting, isLoading, validateUsernameInput, onSubmit]);

  const isFormValid = username.trim() && password.trim() && selectedRole && !validationError;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 服务器错误信息提示 */}
      {error && <ErrorAlert message={error} />}

      {/* 用户名输入 */}
      <div className="space-y-2">
        <label htmlFor="login-username" className="text-white/90 text-sm font-medium">
          {getUsernameLabel()}
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            id="login-username"
            type="text"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            inputMode={selectedRole === "student" ? "numeric" : "text"}
            autoComplete="username"
            aria-describedby={validationError ? "login-username-error" : undefined}
            aria-invalid={!!validationError}
            className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:border-transparent
                     transition-all duration-300
                     ${validationError ? "border-red-500 focus:ring-red-400" : "border-white/20 focus:ring-blue-400"}`}
            placeholder={`请输入${getUsernameLabel()}`}
            aria-label={getUsernameLabel()}
            required
          />
        </div>
        {validationError && (
          <p id="login-username-error" className="text-red-400 text-xs" role="alert">
            {validationError}
          </p>
        )}
      </div>

      {/* 密码输入 */}
      <div className="space-y-2">
        <label htmlFor="login-password" className="text-white/90 text-sm font-medium">
          密码
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            id="login-password"
            ref={passwordInputRef}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                     transition-all duration-300"
            placeholder="请输入密码"
            aria-label="密码"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
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
        disabled={!isFormValid || isLoading || isSubmitting}
        className={`
          w-full py-3 px-6 rounded-lg font-medium text-white
          transition-all duration-300 flex items-center justify-center space-x-2
          ${
            isFormValid && !isLoading && !isSubmitting
              ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 shadow-lg hover:shadow-xl"
              : "bg-white/20 cursor-not-allowed"
          }
        `}
        aria-label="登录"
      >
        {isLoading || isSubmitting ? (
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
