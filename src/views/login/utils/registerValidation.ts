// 注册表单验证规则

export interface ValidationResult {
  isValid: boolean;
  error: string;
}

/**
 * 验证学号（学生）
 * 规则：8位及以上纯数字
 */
export const validateStudentUsername = (username: string): ValidationResult => {
  const trimmed = username.trim();

  if (!trimmed) {
    return { isValid: false, error: "学号不能为空" };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { isValid: false, error: "学号只能包含数字" };
  }

  if (trimmed.length < 8) {
    return { isValid: false, error: "学号至少需要8位" };
  }

  return { isValid: true, error: "" };
};

/**
 * 验证账号（教师/助教）
 * 规则：8位及以上，可以是纯数字或数字+字母组合
 */
export const validateTeacherUsername = (username: string): ValidationResult => {
  const trimmed = username.trim();

  if (!trimmed) {
    return { isValid: false, error: "账号不能为空" };
  }

  if (trimmed.length < 8) {
    return { isValid: false, error: "账号至少需要8位" };
  }

  // 只能包含字母和数字
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return { isValid: false, error: "账号只能包含字母和数字" };
  }

  return { isValid: true, error: "" };
};

/**
 * 验证密码
 * 规则：至少6位，可为纯数字
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: "密码不能为空" };
  }

  if (password.length < 6) {
    return { isValid: false, error: "密码至少需要6位" };
  }

  return { isValid: true, error: "" };
};

/**
 * 验证确认密码
 */
export const validateConfirmPassword = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: "请确认密码" };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: "两次输入的密码不一致" };
  }

  return { isValid: true, error: "" };
};

/**
 * 验证姓名
 * 规则：2-20个字符，不能为空
 */
export const validateName = (name: string): ValidationResult => {
  const trimmed = name.trim();

  if (!trimmed) {
    return { isValid: false, error: "姓名不能为空" };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: "姓名至少需要2个字符" };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: "姓名不能超过20个字符" };
  }

  return { isValid: true, error: "" };
};

/**
 * 验证邮箱
 * 规则：标准邮箱格式
 */
export const validateEmail = (email: string): ValidationResult => {
  const trimmed = email.trim();

  if (!trimmed) {
    return { isValid: false, error: "邮箱不能为空" };
  }

  // 简单的邮箱正则验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: "请输入有效的邮箱地址" };
  }

  return { isValid: true, error: "" };
};

/**
 * 验证手机号
 * 规则：11位数字（中国手机号）
 */
export const validatePhone = (phone: string): ValidationResult => {
  const trimmed = phone.trim();

  if (!trimmed) {
    return { isValid: false, error: "手机号不能为空" };
  }

  // 验证是否为11位数字
  if (!/^\d{11}$/.test(trimmed)) {
    return { isValid: false, error: "请输入11位手机号" };
  }

  // 验证是否以1开头
  if (!trimmed.startsWith("1")) {
    return { isValid: false, error: "请输入有效的手机号" };
  }

  return { isValid: true, error: "" };
};

/**
 * 根据角色验证用户名
 */
export const validateUsername = (
  username: string,
  role: string
): ValidationResult => {
  if (role === "student") {
    return validateStudentUsername(username);
  } else {
    return validateTeacherUsername(username);
  }
};
