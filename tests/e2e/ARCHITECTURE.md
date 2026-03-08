# E2E 测试架构文档

## 🏗️ 优化后的架构概览

当前学生端默认套件已经切换到 `tests/e2e/shiyan/`。旧版以 `page.route()` 为主的 mock-heavy 套件已下线，现行实现以真实后端和 API 辅助状态准备为主。

```
fe/tests/e2e/
├── fixtures.ts                 # ⭐ 自动生成：常量定义（前后端同步）
├── fixtures/
│   └── index.ts               # ⭐ 新增：Playwright Fixtures 扩展
├── factories/
│   └── StudentFactory.ts      # ⭐ 新增：数据工厂（类型安全查询）
├── helpers/
│   ├── api-helpers.ts         # ⭐ 新增：API 快速数据准备
│   └── index.ts               # 导出所有 helper
├── generated/
│   └── fixtures.json          # ⭐ 自动生成：JSON 格式 fixtures
├── setup/
│   ├── setup-utils.ts         # 测试启动工具
│   └── global-setup.*.ts      # 各角色全局设置
└── ARCHITECTURE.md            # ⭐ 本文件
```

---

## 🎯 核心优化点

### 1. 代码生成（Codegen）

**问题**：前后端数据定义不同步  
**解决**：`be/scripts/generate-e2e-fixtures.ts`

```bash
# 运行代码生成
bun run e2e:gen

# 或在运行测试时自动执行
bun run e2e:teacher  # 会先执行 e2e:gen
```

**生成内容**：
- `fe/tests/e2e/fixtures.ts` - TypeScript 常量
- `fe/tests/e2e/generated/fixtures.json` - JSON 调试文件

---

### 2. Playwright Fixtures 扩展

**文件**：`fe/tests/e2e/fixtures/index.ts`

**功能**：
- `loginPage` - 登录页面对象
- `teacherPage` - 已登录的教师页面（自动登录）
- `assistantPage` - 已登录的助教页面（自动登录）
- `adminPage` - 已登录的管理员页面（自动登录）
- `testData` - 自动推断角色的测试数据上下文

**使用示例**：

```typescript
import { test, expect } from "../fixtures";

test("创建班级", async ({ teacherPage }) => {
  // teacherPage 已经登录，直接使用
  await teacherPage.getByRole("button", { name: "新增班级" }).click();
  // ...
});
```

---

### 3. 数据工厂（Data Factory）

**文件**：`fe/tests/e2e/factories/StudentFactory.ts`

**功能**：
- 生成新学生数据
- 查询种子数据中的学生（按状态、标签、班级）
- 验证学生ID是否存在

**使用示例**：

```typescript
import { StudentFactory } from "../factories/StudentFactory";

// 查询待评阅学生
const pendingStudents = StudentFactory.byStatus("pending_review");

// 查询特定标签的学生
const xssTestStudents = StudentFactory.byTag("xss");

// 验证学生存在
if (StudentFactory.exists("20240052")) {
  // ...
}
```

---

### 4. API Helpers

**文件**：`fe/tests/e2e/helpers/api-helpers.ts`

**功能**：通过 API 快速准备测试数据，比 UI 操作更高效

**使用示例**：

```typescript
import { getAuthToken, createStudentViaAPI, submitReportViaAPI } from "../helpers/api-helpers";

// 快速创建测试数据
test("批量评阅", async ({ page }) => {
  const token = await getAuthToken("teacher");
  
  // API 快速创建学生（比 UI 快 10x）
  await createStudentViaAPI(token, { username: "test_001", classId: 2 });
  await submitReportViaAPI(token, "test_001", { experimentId: 900001 });
  
  // UI 验证功能
  await page.goto("/teacher.html#/reports");
  // ...
});
```

---

## 📊 数据架构

### 数据层级

```
L0: Base Data（基础数据）
    └── 所有角色共用的基础配置（实验模板、题库）

L1: Role Context（角色上下文）
    ├── TeacherContext:  班级1 + 学生 20240001-20
    ├── AssistantContext: 班级2 + 学生 20240051-55
    └── ShiyanContext:   学生 20240002（完整实验数据）

L2: Test Scenario（测试场景）
    ├── 待评阅报告场景
    ├── 已驳回报告场景
    └── 边缘案例场景

L3: Test Case（测试用例隔离）
    └── 每个测试的临时数据（通过 API 创建）
```

### 学生数据定义

| 学生ID | 班级 | 状态 | 标签 |
|:---|:---:|:---|:---|
| 20240001-05 | 1 | completed/in_progress/not_started | - |
| 20240010 | 1 | graded_perfect | - |
| 20240011 | 1 | graded_pass | - |
| 20240012 | 1 | graded_zero | - |
| 20240013 | 1 | pending_review | - |
| 20240014-20 | 1 | completed | xss, sql_injection, long_text, formatted, html_tags, short_duration, long_duration |
| 20240051-55 | 2 | graded/pending_review/rejected/in_progress | - |

---

## 🚀 使用指南

### 运行测试

```bash
# 运行所有测试
bun run e2e:all

# 运行特定角色测试（会自动生成 fixtures）
bun run e2e:teacher
bun run e2e:assistant
bun run e2e:admin
bun run e2e:shiyan

# 带界面调试
bun run e2e:teacher:headed

# 仅生成 fixtures
bun run e2e:gen

# 清理环境
bun run e2e:clean
```

### 编写新测试

```typescript
// 方式1：使用传统 helper（向后兼容）
import { test, expect } from "@playwright/test";
import { loginAs, ACCOUNTS, TEST_DATA } from "../helpers";

test("传统方式", async ({ page }) => {
  await loginAs(page, { 
    username: ACCOUNTS.teacher.username, 
    password: ACCOUNTS.teacher.password,
    role: "teacher"
  });
  // ...
});

// 方式2：使用新的 fixtures（推荐）
import { test, expect } from "../fixtures";
import { StudentFactory } from "../factories/StudentFactory";

test("新方式", async ({ teacherPage }) => {
  const studentId = StudentFactory.byStatus("pending_review")[0];
  await teacherPage.getByText(studentId).click();
  // ...
});
```

---

## 📁 文件关系图

```
be/scripts/
├── generate-e2e-fixtures.ts     # 代码生成器
├── e2e-seed-teacher-fixtures.ts # Teacher 种子
├── e2e-seed-assistant-fixtures.ts # Assistant 种子
├── e2e-seed-edge-cases.ts       # 边缘案例种子
└── e2e-seed-shiyan-fixtures.ts  # Shiyan 种子
         │
         │  bun run e2e:gen
         ▼
fe/tests/e2e/
├── fixtures.ts                  # 生成的 TypeScript 常量
├── generated/fixtures.json      # 生成的 JSON 文件
├── fixtures/index.ts            # Playwright Fixtures
├── factories/StudentFactory.ts  # 数据工厂
└── helpers/api-helpers.ts       # API 快速数据准备
```

---

## ✅ 验证结果

| 角色 | 测试数 | 通过 | 状态 |
|:---|:---:|:---:|:---:|
| Teacher | 23 | 23 | ✅ |
| Assistant | 14 | 14 | ✅ |
| Admin | 11 | 11 | ✅ |
| Shiyan | 42 | 42 | ✅ |
| **总计** | **90** | **90** | 🎉 |

---

## 📝 维护指南

### 添加新学生到种子数据

1. **修改后端种子**（如 `e2e-seed-teacher-fixtures.ts`）：
```typescript
const FIXTURES: ExperimentFixture[] = [
  // ... 现有学生
  {
    username: "20240099",  // 新学生
    classId: 1,
    // ... 其他字段
  },
];
```

2. **重新生成 fixtures**：
```bash
bun run e2e:gen
```

3. **在测试中使用**：
```typescript
// fixtures.ts 会自动更新
import { STUDENTS } from "../fixtures";

// 或通过工厂查询
const students = StudentFactory.byClass(1);
```

### 更新代码生成器

修改 `be/scripts/generate-e2e-fixtures.ts`，然后运行：
```bash
bun run e2e:gen
```

---

## 🎉 优化成果

1. **数据一致性**：前后端通过代码生成保持同步
2. **类型安全**：TypeScript 类型定义避免拼写错误
3. **开发效率**：Playwright Fixtures 减少样板代码
4. **测试稳定性**：工厂模式提供可靠的数据查询
5. **执行速度**：API Helpers 支持快速数据准备
