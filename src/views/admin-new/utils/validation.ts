/**
 * Admin 模块表单验证工具
 */

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

/**
 * 用户名验证（学号/账号）
 * 规则：3-20个字符，只能包含英文、数字、下划线
 */
export const validateUsername = (username: string): ValidationResult => {
  const trimmed = username.trim();

  if (!trimmed) {
    return { valid: false, error: '用户名不能为空' };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: '用户名至少需要3个字符' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: '用户名不能超过20个字符' };
  }

  const validPattern = /^[a-zA-Z0-9_]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: '用户名只能包含英文、数字和下划线' };
  }

  return { valid: true, error: null };
};

/**
 * 姓名验证
 * 规则：2-20个字符，允许中文、英文、空格
 */
export const validateFullName = (fullName: string): ValidationResult => {
  const trimmed = fullName.trim();

  if (!trimmed) {
    return { valid: false, error: '姓名不能为空' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: '姓名至少需要2个字符' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: '姓名不能超过20个字符' };
  }

  const validPattern = /^[\u4e00-\u9fa5a-zA-Z\s]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: '姓名只能包含中文、英文和空格' };
  }

  return { valid: true, error: null };
};

/**
 * 密码验证
 * 规则：6-20个字符
 */
export const validatePassword = (password: string, options?: {
  minLength?: number;
  requireMixed?: boolean;
}): ValidationResult => {
  const minLength = options?.minLength || 6;
  const requireMixed = options?.requireMixed || false;

  if (!password) {
    return { valid: false, error: '密码不能为空' };
  }

  if (password.length < minLength) {
    return { valid: false, error: `密码至少需要${minLength}个字符` };
  }

  if (password.length > 20) {
    return { valid: false, error: '密码不能超过20个字符' };
  }

  if (requireMixed) {
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasLetter || !hasNumber) {
      return { valid: false, error: '密码需要同时包含字母和数字' };
    }
  }

  return { valid: true, error: null };
};

/**
 * 邮箱验证
 */
export const validateEmail = (email: string, required: boolean = true): ValidationResult => {
  const trimmed = email.trim();

  if (!trimmed) {
    if (required) {
      return { valid: false, error: '邮箱不能为空' };
    }
    return { valid: true, error: null };
  }

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(trimmed)) {
    return { valid: false, error: '邮箱格式不正确' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: '邮箱长度不能超过100个字符' };
  }

  return { valid: true, error: null };
};

/**
 * 手机号验证（中国大陆）
 * 规则：11位数字，1开头
 */
export const validatePhone = (phone: string, required: boolean = false): ValidationResult => {
  const trimmed = phone.trim();

  if (!trimmed) {
    if (required) {
      return { valid: false, error: '手机号不能为空' };
    }
    return { valid: true, error: null };
  }

  const phonePattern = /^1[3-9]\d{9}$/;
  if (!phonePattern.test(trimmed)) {
    return { valid: false, error: '手机号格式不正确（请输入11位手机号）' };
  }

  return { valid: true, error: null };
};
