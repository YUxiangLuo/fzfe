/**
 * 通用表单验证工具
 * 专为中文用户设计的表单验证函数集合
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

  // 只允许英文、数字、下划线
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

  // 允许中文、英文字母、空格
  const validPattern = /^[\u4e00-\u9fa5a-zA-Z\s]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: '姓名只能包含中文、英文和空格' };
  }

  return { valid: true, error: null };
};

/**
 * 密码验证
 * 规则：6-20个字符，建议包含字母和数字
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

  // 可选：要求包含字母和数字
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
 * 密码确认验证
 */
export const validatePasswordConfirm = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword) {
    return { valid: false, error: '请确认密码' };
  }

  if (password !== confirmPassword) {
    return { valid: false, error: '两次输入的密码不一致' };
  }

  return { valid: true, error: null };
};

/**
 * 邮箱验证
 * 规则：标准邮箱格式
 */
export const validateEmail = (email: string, required: boolean = true): ValidationResult => {
  const trimmed = email.trim();

  if (!trimmed) {
    if (required) {
      return { valid: false, error: '邮箱不能为空' };
    }
    return { valid: true, error: null };
  }

  // 标准邮箱格式验证
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

  // 中国大陆手机号：11位，1开头
  const phonePattern = /^1[3-9]\d{9}$/;
  if (!phonePattern.test(trimmed)) {
    return { valid: false, error: '手机号格式不正确（请输入11位手机号）' };
  }

  return { valid: true, error: null };
};

/**
 * 班级名称验证
 * 规则：2-50个字符，允许中文、英文、数字、短横线、下划线
 */
export const validateClassName = (name: string): ValidationResult => {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: '班级名称不能为空' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: '班级名称至少需要2个字符' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: '班级名称不能超过50个字符' };
  }

  // 允许中文、英文、数字、短横线、下划线
  const validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9\-_]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: '班级名称只能包含中文、英文、数字、短横线和下划线' };
  }

  return { valid: true, error: null };
};

/**
 * 班级代码验证
 * 规则：2-20个字符，只能包含英文、数字、短横线、下划线
 */
export const validateClassCode = (code: string): ValidationResult => {
  const trimmed = code.trim();

  if (!trimmed) {
    return { valid: false, error: '班级代码不能为空' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: '班级代码至少需要2个字符' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: '班级代码不能超过20个字符' };
  }

  // 只允许英文、数字、短横线、下划线
  const validPattern = /^[a-zA-Z0-9\-_]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: '班级代码只能包含英文、数字、短横线和下划线' };
  }

  return { valid: true, error: null };
};

/**
 * 题目内容验证
 * 规则：10-500个字符
 */
export const validateQuestionText = (text: string): ValidationResult => {
  const trimmed = text.trim();

  if (!trimmed) {
    return { valid: false, error: '题目内容不能为空' };
  }

  if (trimmed.length < 10) {
    return { valid: false, error: '题目内容至少需要10个字符' };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: '题目内容不能超过500个字符' };
  }

  return { valid: true, error: null };
};

/**
 * 题目选项验证
 * 规则：1-100个字符
 */
export const validateQuestionOption = (option: string): ValidationResult => {
  const trimmed = option.trim();

  if (!trimmed) {
    return { valid: false, error: '选项内容不能为空' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: '选项内容不能超过100个字符' };
  }

  return { valid: true, error: null };
};

/**
 * 数字范围验证
 */
export const validateNumberRange = (
  value: number,
  min: number,
  max: number,
  fieldName: string = '数值'
): ValidationResult => {
  if (isNaN(value)) {
    return { valid: false, error: `${fieldName}必须是有效的数字` };
  }

  if (value < min) {
    return { valid: false, error: `${fieldName}不能小于${min}` };
  }

  if (value > max) {
    return { valid: false, error: `${fieldName}不能大于${max}` };
  }

  return { valid: true, error: null };
};

/**
 * 百分比验证（0-100）
 */
export const validatePercentage = (value: number, fieldName: string = '百分比'): ValidationResult => {
  return validateNumberRange(value, 0, 100, fieldName);
};

/**
 * 成绩验证（0-100）
 */
export const validateScore = (score: number): ValidationResult => {
  return validateNumberRange(score, 0, 100, '成绩');
};

/**
 * 批量验证
 * 返回第一个验证失败的错误
 */
export const validateAll = (...validations: ValidationResult[]): ValidationResult => {
  for (const validation of validations) {
    if (!validation.valid) {
      return validation;
    }
  }
  return { valid: true, error: null };
};
