/**
 * Centralized selectors for E2E tests
 * 
 * Using data-testid attributes is preferred, but when not available,
 * we use semantic selectors with Chinese text as fallback.
 */

// ===== Common Selectors =====

export const CommonSelectors = {
  // Messages
  successMessage: ".ant-message-notice-content",
  errorMessage: ".ant-message-notice-content",
  warningMessage: ".ant-message-notice-content",
  alertMessage: ".ant-alert",
  
  // Modals
  modal: ".ant-modal",
  modalTitle: ".ant-modal-title",
  modalCloseBtn: ".ant-modal-close",
  modalConfirmBtn: ".ant-btn-primary",
  modalCancelBtn: ".ant-btn-default",
  
  // Forms
  formItem: ".ant-form-item",
  formInput: "input, textarea",
  formSelect: ".ant-select",
  formSubmitBtn: "button[type='submit']",
  
  // Tables
  table: ".ant-table",
  tableRow: "tr",
  tableCell: "td",
  pagination: ".ant-pagination",
  paginationItem: ".ant-pagination-item",
  paginationActive: ".ant-pagination-item-active",
  
  // Cards
  card: ".ant-card",
  cardTitle: ".ant-card-head-title",
  cardBody: ".ant-card-body",
  
  // Statistics
  statistic: ".ant-statistic",
  statisticTitle: ".ant-statistic-title",
  statisticValue: ".ant-statistic-content-value",
  
  // Loading
  spinner: ".ant-spin",
  skeleton: ".ant-skeleton",
} as const;

// ===== Page-Specific Selectors =====

export const LoginSelectors = {
  usernameInput: "#login-username",
  passwordInput: "#login-password",
  teacherTab: { role: "button", name: /教师/ },
  assistantTab: { role: "button", name: /助教/ },
  adminTab: { role: "button", name: /管理员/ },
  loginBtn: { role: "button", name: /登录系统|登录/ },
} as const;

export const LayoutSelectors = {
  header: "header",
  sider: ".ant-layout-sider",
  content: ".ant-layout-content",
  menu: ".ant-menu",
  menuItem: { role: "menuitem" },
  subMenu: ".ant-menu-submenu",
  userAvatar: "header .ant-avatar",
  logoutMenuItem: { role: "menuitem", name: "退出登录" },
  menuToggleBtn: "header button",
} as const;

export const ClassManagementSelectors = {
  addClassBtn: { role: "button", name: "新增班级" },
  editClassBtn: { role: "button", name: "编辑" },
  deleteClassBtn: { role: "button", name: "删除" },
  studentListBtn: { role: "button", name: "学生列表" },
  classNameInput: "班级名称",
  classCodeInput: "班级编号",
  downloadTemplateBtn: { role: "button", name: "下载模板" },
  fileInput: "input[type='file']",
  confirmDeleteBtn: { role: "button", name: /删\s*除/ },
} as const;

export const StudentManagementSelectors = {
  addStudentBtn: { role: "button", name: "添加学生" },
  addFromLibraryBtn: { role: "button", name: "从学生库添加" },
  resetPasswordBtn: { role: "button", name: "设置密码" },
  removeStudentBtn: { role: "button", name: "移除" },
  studentNoInput: "学号",
  studentNameInput: "姓名",
  passwordInput: "初始密码",
  searchInput: { placeholder: "学号或姓名" },
  classSelect: ".ant-select",
} as const;

export const AssistantManagementSelectors = {
  createAssistantBtn: { role: "button", name: "创建助教" },
  selectFromLibraryBtn: { role: "button", name: "从库中选择" },
  reassignBtn: { role: "button", name: "重新分配" },
  usernameInput: "用户名",
  fullNameInput: "姓名",
  emailInput: "邮箱",
  phoneInput: "手机号",
  passwordInput: "密码",
  classSelectLabel: "分配到班级",
} as const;

export const ExperimentReportSelectors = {
  searchInput: { placeholder: "学号或姓名" },
  reviewBtn: { role: "button", name: "评阅" },
  exportCsvBtn: { role: "button", name: "导出 CSV" },
  exportAllBtn: { role: "button", name: "导出所有报告" },
  downloadCsvLink: { role: "link", name: "下载 CSV" },
  downloadReportLink: { role: "link", name: "下载报告文件" },
  reportScoreInput: { placeholder: "请输入报告得分" },
  modelScoreInput: { placeholder: "请输入模型选择得分" },
  feedbackInput: { placeholder: "请输入评语，可为空" },
  saveReviewBtn: { role: "button", name: "保存评阅结果" },
  statusSubmitted: "待评阅",
  statusGraded: "已评阅",
  statusRejected: "已驳回",
} as const;

export const ExperimentProgressSelectors = {
  searchInput: { placeholder: "学号或姓名" },
  expandIcon: ".ant-table-row-expand-icon",
  totalStudentsStat: "学生总数",
  completedStat: "已完成",
  inProgressStat: "进行中",
  notStartedStat: "实验已创建",
  avgCompletionStat: "平均完成度",
  stepCompletionText: "步骤完成情况",
  timelineText: "操作时间线",
} as const;

export const ExperimentLogSelectors = {
  searchInput: { placeholder: "学号或姓名" },
  totalExperimentsStat: "总实验次数",
  totalStudentsStat: "总学生数",
  totalDurationStat: "总时长",
  avgDurationStat: "平均每次实验时长",
} as const;

export const QuestionBankSelectors = {
  refreshBtn: { role: "button", name: "刷新" },
  previewBtn: { role: "button", name: "预览" },
  editBtn: { role: "button", name: "编辑" },
  deleteBtn: { role: "button", name: "删除" },
  searchInput: { placeholder: "输入题目内容" },
  questionTextInput: "题目内容",
  questionTypeSelect: "题目类型",
  knowledgePointInput: "知识点",
} as const;

export const GradeWeightSelectors = {
  saveBtn: { role: "button", name: "保存设置" },
  resetBtn: { role: "button", name: "恢复默认" },
  topLevelWeightTitle: "顶层权重",
  flowDetailWeightTitle: "实验流程细节权重",
} as const;

export const GradeOverviewSelectors = {
  searchInput: { placeholder: "搜索学号或姓名" },
  exportBtn: { role: "button", name: "导出成绩" },
  detailBtn: { role: "button", name: "详情" },
  collapseBtn: { role: "button", name: "收起" },
  allClassesOption: "全部班级",
  classCardClickHint: "点击查看详情",
  scoreDistributionTitle: "成绩分布",
  totalStudentsStat: "总人数",
  gradedCountStat: "已评分",
  averageScoreStat: "平均分",
  maxScoreStat: "最高分",
  minScoreStat: "最低分",
} as const;

export const AdminManualSelectors = {
  addBtn: { role: "button", name: "新增" },
  fileInput: 'input[type="file"]',
  manualNameInput: "手册名称",
  remarkInput: "备注",
} as const;

export const AdminDatasetSelectors = {
  addBtn: { role: "button", name: "新增数据" },
  fileInput: 'input[type="file"]',
  datasetNameInput: "数据集名称",
  remarkInput: "备注",
  downloadTemplateBtn: { role: "button", name: "下载模板" },
  csvHeaders: ["行业名称", "公司名称", "产品名称", "年份", "月份", "销售数量", "数量单位"] as string[],
} as const;

export const AdminUserSelectors = {
  addTeacherBtn: /^添加教师$/,
  addAssistantBtn: /^添加助教$/,
  batchAddTeacherBtn: /^批量添加教师$/,
  batchAddAssistantBtn: /^批量添加助教$/,
  searchInput: { placeholder: "输入关键字搜索" },
  usernameInput: "用户名",
  fullNameInput: "姓名",
  emailInput: "邮箱",
  phoneInput: "手机号",
  passwordInput: "密码",
  newPasswordInput: "新密码",
  confirmPasswordInput: "确认密码",
} as const;

export const AdminClassSelectors = {
  searchInput: { placeholder: "请输入班级名称或编号" },
  viewDetailBtn: { role: "button", name: "查看班级详情" },
} as const;

export const PersonalInfoSelectors = {
  editBtn: { role: "button", name: "编辑信息" },
  saveBtn: { role: "button", name: /保存修改/ },
  fullNameInput: "姓名",
  phoneInput: "手机号码",
  emailInput: "邮箱",
  currentPasswordInput: { placeholder: "请输入当前密码" },
  newPasswordInput: { placeholder: "至少6个字符" },
  confirmPasswordInput: { placeholder: "再次输入新密码" },
  savePasswordBtn: { role: "button", name: "保存新密码" },
  passwordCard: "修改密码",
} as const;

// ===== Text Constants =====

export const SuccessMessages = {
  classCreated: "班级创建成功",
  classUpdated: "班级信息更新成功",
  classDeleted: "班级删除成功",
  studentAdded: "学生添加成功",
  studentRemoved: "学生已移除",
  passwordReset: "密码重置成功",
  assistantCreated: "助教创建成功",
  assistantAssigned: "助教分配成功",
  assistantUnassigned: "助教已从所有班级解绑",
  reviewSaved: "评阅结果保存成功",
  csvExported: "导出成功",
  reportsExported: "报告文件导出成功",
  questionCreated: "题目创建成功",
  questionUpdated: "题目更新成功",
  questionDeleted: "题目已删除",
  weightsSaved: "权重保存成功",
  weightsReset: "已恢复默认权重",
  gradesExported: "导出成功",
  personalInfoSaved: "个人信息保存成功",
  passwordChanged: "密码修改成功",
  // Admin-specific
  uploadSuccess: "上传成功",
  saveSuccess: "保存成功",
  deleteSuccess: "删除成功",
  statusUpdated: "状态更新成功",
  teacherAdded: "教师添加成功",
  assistantAdded: "助教添加成功",
  userDeleted: "用户删除成功",
  resetPassword: "重置密码",
  batchTeacherAdded: "批量添加教师成功",
  batchAssistantAdded: "批量添加助教成功",
} as const;

export const ErrorMessages = {
  weightSumError: "顶层权重总和必须为 100%",
  // File upload
  pdfOnly: "仅支持上传PDF格式文件",
  csvOnlyDataset: "仅支持上传CSV文件",
  pdfRequired: "请上传PDF文件",
  dataFileRequired: "请上传数据文件",
  // Name length
  manualNameTooShort: "手册名称至少需要2个字符",
  manualNameTooLong: "手册名称不能超过100个字符",
  datasetNameTooShort: "数据集名称至少需要2个字符",
  // Password
  passwordTooShort: "密码至少需要6个字符",
  passwordMismatch: "两次输入的密码不一致",
} as const;

export const ModalTitles = {
  createClass: "新增班级",
  editClass: "编辑班级",
  deleteClass: /确定要删除班级/,
  studentList: /学生列表/,
  addStudent: "添加学生",
  resetPassword: /重置密码/,
  removeStudent: "确认移除学生",
  createAssistant: "创建助教",
  reassignAssistant: /重新分配/,
  selectAssistant: "从库中选择助教",
  reviewReport: /评阅报告/,
  editPersonalInfo: "编辑个人信息",
  logoutConfirm: "确认退出",
  deleteConfirm: /确认删除/,
  // Admin-specific
  addManual: "新增实验手册",
  editManual: "修改实验手册",
  addDataset: "新增实验数据",
  editDataset: "修改实验数据",
  addTeacher: "添加教师",
  addAssistant: "添加助教",
  batchAddTeacher: "批量添加教师",
  batchAddAssistant: "批量添加助教",
  resetUserPassword: "修改用户",
  classDetail: /班级详情/,
} as const;

// ===== Menu Paths =====

export const MenuPaths = {
  classManagement: { menu: "班级管理", heading: "班级管理" },
  studentManagement: { menu: "学生管理", heading: "学生管理" },
  assistantManagement: { parent: "账户设置", menu: "助教管理", heading: "助教管理" },
  personalInfo: { parent: "账户设置", menu: "个人信息", heading: "个人信息管理" },
  experimentProgress: { parent: "实验管理", menu: "实验进度", heading: "实验进度" },
  experimentReports: { parent: "实验管理", menu: "实验报告", heading: "实验报告" },
  experimentLogs: { parent: "实验管理", menu: "实验日志", heading: "实验日志" },
  questionBank: { parent: "考核管理", menu: "题库管理", heading: "题库管理" },
  gradeWeights: { parent: "考核管理", menu: "成绩权重", heading: "成绩权重设置" },
  gradeOverview: { parent: "考核管理", menu: "成绩总览", heading: "成绩总览" },
} as const;
