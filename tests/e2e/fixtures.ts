/**
 * E2E Test Fixtures and Constants
 * 
 * Shared test data sourced from backend seed files.
 * Keep in sync with be/scripts/e2e-seed-*.ts
 */

// ===== Test Accounts =====

export const ACCOUNTS = {
  teacher: {
    username: process.env.E2E_TEACHER_USERNAME ?? "teacher1",
    password: process.env.E2E_TEACHER_PASSWORD ?? "TeacherE2E!234",
    tempPassword: process.env.E2E_TEACHER_TEMP_PASSWORD ?? "TeacherE2E!567",
  },
  assistant: {
    username: process.env.E2E_ASSISTANT_USERNAME ?? "assistant2",
    password: process.env.E2E_ASSISTANT_PASSWORD ?? "AssistantE2E!234",
    tempPassword: process.env.E2E_ASSISTANT_TEMP_PASSWORD ?? "AssistantE2E!567",
  },
  student: {
    username: process.env.E2E_STUDENT_USERNAME ?? "20240001",
    password: process.env.E2E_STUDENT_PASSWORD ?? "StudentE2E!123",
  },
} as const;

// ===== Test Data Constants =====

export const TEST_DATA = {
  // Class constants
  defaultClassName: "计算机科学与技术2502",
  defaultClassId: 2,
  
  // Teacher specific (Class 1)
  teacherClassName: "计算机科学与技术2501",
  teacherClassId: 1,
  
  // Student usernames for testing
  students: {
    // Assistant test targets (Class 2)
    pendingReview1: "20240052",  // 待评阅学生1
    pendingReview2: "20240055",  // 待评阅学生2（与teacher seed共用）
    pendingReview3: "20240056",  // 待评阅学生3（批量评阅）
    pendingReview4: "20240057",  // 待评阅学生4
    
    // Teacher test targets (Class 1)
    perfectScore: "20240010",    // 满分100
    passThreshold: "20240011",   // 及格线60
    zeroScore: "20240012",       // 零分0
    pendingTeacher: "20240013",  // 待评阅（教师测试）
    
    // Edge cases for special content testing
    xssTest: "20240014",         // XSS攻击内容
    sqlInjection: "20240015",    // SQL注入
    longText: "20240016",        // 超长文本
    formatted: "20240017",       // 格式化文本
    htmlTags: "20240018",        // HTML标签
    
    // Time edge cases
    shortDuration: "20240019",   // 极短实验时间（1分钟）
    longDuration: "20240020",    // 极长实验时间（24小时）
  },
} as const;

// ===== API Endpoints =====

export const API = {
  gradingPolicy: /\/api\/v1\/classes\/\d+\/grading-policy$/,
  classGradeSummaries: /\/api\/v1\/classes\/\d+\/grade-summaries/,
  assistantGradeSummaries: /\/assistants\/\d+\/grade-summaries/,
  teacherGradeSummaries: /\/teachers\/\d+\/grade-summaries/,
} as const;

// ===== Timeouts =====

export const TIMEOUTS = {
  navigation: 5000,
  modal: 3000,
  message: 20000,
  api: 10000,
} as const;
