import React, { useState } from "react";
import { User, Lock, Mail, Phone, Eye, EyeOff, UserPlus, AlertCircle, IdCard } from "lucide-react";
import {
  validateUsername,
  validatePassword,
  validateConfirmPassword,
  validateName,
  validateEmail,
  validatePhone,
} from "../utils/registerValidation";

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

  // 验证错误状态
  const [errors, setErrors] = useState({
    username: "",
    name: "",
    password: "",
    confirmPassword: "",
    email: "",
    phone: "",
  });

  // 字段是否被触碰过（用于控制何时显示错误）
  const [touched, setTouched] = useState({
    username: false,
    name: false,
    password: false,
    confirmPassword: false,
    email: false,
    phone: false,
  });

  // 判断是否需要显示手机号字段（教师和助教需要）
  const needsPhone = selectedRole === "teacher" || selectedRole === "assistant";

  // 处理用户名输入
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    const result = validateUsername(value, selectedRole);
    setErrors((prev) => ({ ...prev, username: result.error }));
  };

  // 处理姓名输入
  const handleNameChange = (value: string) => {
    setName(value);
    const result = validateName(value);
    setErrors((prev) => ({ ...prev, name: result.error }));
  };

  // 处理密码输入
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const result = validatePassword(value);
    setErrors((prev) => ({ ...prev, password: result.error }));

    // 如果确认密码已填写，也要重新验证确认密码
    if (confirmPassword) {
      const confirmResult = validateConfirmPassword(value, confirmPassword);
      setErrors((prev) => ({ ...prev, confirmPassword: confirmResult.error }));
    }
  };

  // 处理确认密码输入
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    const result = validateConfirmPassword(password, value);
    setErrors((prev) => ({ ...prev, confirmPassword: result.error }));
  };

  // 处理邮箱输入
  const handleEmailChange = (value: string) => {
    setEmail(value);
    const result = validateEmail(value);
    setErrors((prev) => ({ ...prev, email: result.error }));
  };

  // 处理手机号输入
  const handlePhoneChange = (value: string) => {
    setPhone(value);
    const result = validatePhone(value);
    setErrors((prev) => ({ ...prev, phone: result.error }));
  };

  // 标记字段为已触碰
  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 标记所有字段为已触碰
    setTouched({
      username: true,
      name: true,
      password: true,
      confirmPassword: true,
      email: true,
      phone: true,
    });

    // 执行所有验证
    const usernameResult = validateUsername(username, selectedRole);
    const nameResult = validateName(name);
    const passwordResult = validatePassword(password);
    const confirmPasswordResult = validateConfirmPassword(password, confirmPassword);
    const emailResult = validateEmail(email);
    const phoneResult = needsPhone ? validatePhone(phone) : { isValid: true, error: "" };

    // 更新所有错误
    setErrors({
      username: usernameResult.error,
      name: nameResult.error,
      password: passwordResult.error,
      confirmPassword: confirmPasswordResult.error,
      email: emailResult.error,
      phone: phoneResult.error,
    });

    // 如果有任何错误，不提交
    if (
      !usernameResult.isValid ||
      !nameResult.isValid ||
      !passwordResult.isValid ||
      !confirmPasswordResult.isValid ||
      !emailResult.isValid ||
      (needsPhone && !phoneResult.isValid)
    ) {
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

  // 表单是否有效：所有字段都填写且没有错误
  const isFormValid =
    username.trim() &&
    name.trim() &&
    password &&
    confirmPassword &&
    email.trim() &&
    (!needsPhone || phone.trim()) &&
    !errors.username &&
    !errors.name &&
    !errors.password &&
    !errors.confirmPassword &&
    !errors.email &&
    (!needsPhone || !errors.phone);

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
      {/* 服务器错误信息提示 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
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
            onChange={(e) => handleUsernameChange(e.target.value)}
            onBlur={() => handleBlur("username")}
            className={`w-full pl-10 pr-4 py-2.5 bg-white/10 border rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:border-transparent
                     transition-all duration-300
                     ${touched.username && errors.username ? "border-red-500 focus:ring-red-400" : "border-white/20 focus:ring-blue-400"}`}
            placeholder={`请输入${getUsernameLabel()}`}
            required
          />
        </div>
        {touched.username && errors.username && (
          <p className="text-red-400 text-xs">{errors.username}</p>
        )}
      </div>

      {/* 姓名输入 */}
      <div className="space-y-2">
        <label className="text-white/90 text-sm font-medium">姓名</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={() => handleBlur("name")}
            className={`w-full pl-10 pr-4 py-2.5 bg-white/10 border rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:border-transparent
                     transition-all duration-300
                     ${touched.name && errors.name ? "border-red-500 focus:ring-red-400" : "border-white/20 focus:ring-blue-400"}`}
            placeholder="请输入姓名"
            required
          />
        </div>
        {touched.name && errors.name && (
          <p className="text-red-400 text-xs">{errors.name}</p>
        )}
      </div>

      {/* 邮箱输入 */}
      <div className="space-y-2">
        <label className="text-white/90 text-sm font-medium">邮箱</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={() => handleBlur("email")}
            className={`w-full pl-10 pr-4 py-2.5 bg-white/10 border rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:border-transparent
                     transition-all duration-300
                     ${touched.email && errors.email ? "border-red-500 focus:ring-red-400" : "border-white/20 focus:ring-blue-400"}`}
            placeholder="请输入邮箱地址"
            required
          />
        </div>
        {touched.email && errors.email && (
          <p className="text-red-400 text-xs">{errors.email}</p>
        )}
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
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={() => handleBlur("phone")}
              className={`w-full pl-10 pr-4 py-2.5 bg-white/10 border rounded-lg
                       text-white placeholder-white/50 backdrop-blur-sm
                       focus:outline-none focus:ring-2 focus:border-transparent
                       transition-all duration-300
                       ${touched.phone && errors.phone ? "border-red-500 focus:ring-red-400" : "border-white/20 focus:ring-blue-400"}`}
              placeholder="请输入手机号"
              required
            />
          </div>
          {touched.phone && errors.phone && (
            <p className="text-red-400 text-xs">{errors.phone}</p>
          )}
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
            onChange={(e) => handlePasswordChange(e.target.value)}
            onBlur={() => handleBlur("password")}
            className={`w-full pl-10 pr-12 py-2.5 bg-white/10 border rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:border-transparent
                     transition-all duration-300
                     ${touched.password && errors.password ? "border-red-500 focus:ring-red-400" : "border-white/20 focus:ring-blue-400"}`}
            placeholder="请输入密码（8位以上，含字母和数字）"
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
        {touched.password && errors.password && (
          <p className="text-red-400 text-xs">{errors.password}</p>
        )}
      </div>

      {/* 确认密码输入 */}
      <div className="space-y-2">
        <label className="text-white/90 text-sm font-medium">确认密码</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => handleConfirmPasswordChange(e.target.value)}
            onBlur={() => handleBlur("confirmPassword")}
            className={`w-full pl-10 pr-12 py-2.5 bg-white/10 border rounded-lg
                     text-white placeholder-white/50 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:border-transparent
                     transition-all duration-300
                     ${touched.confirmPassword && errors.confirmPassword ? "border-red-500 focus:ring-red-400" : "border-white/20 focus:ring-blue-400"}`}
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
        {touched.confirmPassword && errors.confirmPassword && (
          <p className="text-red-400 text-xs">{errors.confirmPassword}</p>
        )}
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
