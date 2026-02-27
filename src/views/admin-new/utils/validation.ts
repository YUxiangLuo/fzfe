/**
 * Admin 模块表单验证工具
 */

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

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
