# E2E 测试指南

## 快速开始

### 运行主线回归

```bash
bun run e2e:all
```

### 运行 smoke 测试

```bash
bun run e2e:smoke
bun run e2e:teacher:smoke
bun run e2e:assistant:smoke
bun run e2e:admin:smoke
bun run e2e:shiyan:smoke
```

### 运行特定测试套件

```bash
bun run e2e:teacher
bun run e2e:assistant
bun run e2e:admin
bun run e2e:shiyan
bun run e2e:session
bun run e2e:quiz
bunx playwright test --config=playwright.teacher.multiclass.config.ts
```

### 运行特定测试用例

```bash
# 使用 --grep 过滤
bunx playwright test --config=playwright.teacher.config.ts --grep "班级管理"
bunx playwright test --config=playwright.assistant.config.ts --grep "实验报告"
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `bun run e2e:gen` | 生成 fixtures（前后端同步） |
| `bun run e2e:smoke` | 运行教师/助教/管理员/学生 smoke 测试 |
| `bun run e2e:teacher:smoke` | 教师端 smoke 测试 |
| `bun run e2e:teacher` | 运行教师端测试 |
| `bun run e2e:teacher:headed` | 教师端测试（带浏览器界面） |
| `bun run e2e:assistant:smoke` | 助教端 smoke 测试 |
| `bun run e2e:assistant` | 运行助教端测试 |
| `bun run e2e:assistant:headed` | 助教端测试（带浏览器界面） |
| `bun run e2e:admin:smoke` | 管理员端 smoke 测试 |
| `bun run e2e:admin` | 运行管理员端测试 |
| `bun run e2e:admin:headed` | 管理员端测试（带浏览器界面） |
| `bun run e2e:shiyan:smoke` | 学生端 smoke 测试 |
| `bun run e2e:shiyan` | 运行学生端测试 |
| `bun run e2e:shiyan:headed` | 学生端测试（带浏览器界面） |
| `bun run e2e:shiyan:concurrency` | API 级并发控制回归：模型容量、模型槽位 `429`、PDF 队列 `503` 与重试 |
| `bun run e2e:shiyan:concurrency:model` | 只运行模型并发控制回归 |
| `bun run e2e:shiyan:concurrency:pdf` | 只运行 PDF 队列 `503` 与重试回归 |
| `bun run e2e:shiyan:concurrency:ui` | 真实浏览器 UI 并发回归：模型 `429` 提示、PDF `503` 提示与重试 |
| `bun run e2e:shiyan:concurrency:server` | 64 核服务器 opt-in 压力档：50 学生模型/PDF 并发 |
| `bun run e2e:session` | 运行学生会话恢复测试 |
| `bun run e2e:quiz` | 运行题库相关测试 |
| `bun run e2e:all` | 运行主线 E2E 套件（teacher/assistant/admin/shiyan/session） |

## Smoke 与全量套件

- `smoke` 覆盖教师、助教、管理员、学生四个角色的核心入口链路，适合快速判断系统主流程是否可用。
- `smoke` 脚本会先执行一次 `bun run e2e:gen`，确保在干净环境里也能拿到 `tests/e2e/fixtures.ts` 这份生成常量。
- `smoke` 会按 `E2E_BACKEND_DIR` 定位后端；未配置时默认识别同级 `../fzbe`，并通过 Playwright `globalSetup` 重置数据库。
- 全量套件继续覆盖 CRUD、导出、分页和复杂边缘场景，适合在完整环境下回归。
- 各 Playwright 配置都会执行各自的数据库重置流程，不要手动并行启动多个套件；仓库内脚本默认按顺序执行。

## Shiyan 并发控制回归

并发回归脚本位于 `scripts/shiyan-concurrency-suite.ts`，是 API 级 e2e，不启动前端浏览器。它会使用真实后端、真实 MariaDB advisory lock、真实 Python 模型调用和真实 Chromium/Puppeteer PDF 生成，但通过环境变量把并发上限压到小值，让本机和 64 核服务器都能跑出稳定结果。

默认启动一个受控后端：

- 后端端口：`54108`
- `MAX_CONCURRENT_MODEL_JOBS=2`
- `MAX_CONCURRENT_PDF_JOBS=1`
- `PDF_QUEUE_TIMEOUT_MS=1`
- `DB_CONNECTION_LIMIT=48`

默认会自动准备并发测试数据库数据；如需复用已有后端，可设置 `E2E_CONCURRENCY_AUTO_START_BACKEND=0`，但已有后端必须暴露相同的并发配置。

### 全量并发回归

脚本：`bun run e2e:shiyan:concurrency`

覆盖：

- 模型请求在配置容量内不会返回 `429`
- 训练接口在模型槽位被占满时返回 `429`
- 生产准备接口在全局模型槽位被占满时返回 `429`
- 生产预测接口在模型槽位被占满时返回 `429`
- 同一实验同一模型被执行锁占用时返回 `409`
- 基础模型已有可复用 production artifact 时不占用全局模型槽位
- 融合模型 production prepare 仍在全局模型槽位之后执行
- PDF 报告提交在队列超时时返回 `503`
- PDF `503` 后对失败学生顺序重试可以成功生成报告

输出：

- `test-results/shiyan-concurrency/all-summary.json`

### 只测模型并发

脚本：`bun run e2e:shiyan:concurrency:model`

输出：

- `test-results/shiyan-concurrency/model-summary.json`

### 只测 PDF 队列

脚本：`bun run e2e:shiyan:concurrency:pdf`

输出：

- `test-results/shiyan-concurrency/pdf-summary.json`

### 真实浏览器 UI 并发回归

脚本：`bun run e2e:shiyan:concurrency:ui`

覆盖：

- 真实后端模型槽位被占满时，生产预测页面显示 `模型服务当前繁忙`，且按钮恢复可点击
- 真实后端 PDF 队列返回 `503` 时，报告页面显示 `PDF 生成服务当前繁忙`，按钮恢复可点击，等待槽位释放后再次提交成功

该套件使用独立端口：

- 后端 `54118`
- 前端 `55118`
- `MAX_CONCURRENT_MODEL_JOBS=2`
- `MAX_CONCURRENT_PDF_JOBS=1`
- `PDF_QUEUE_TIMEOUT_MS=1`

### 64 核服务器压力档

脚本：`bun run e2e:shiyan:concurrency:server`

该命令是 opt-in，不属于本机默认验证。它使用 50 名并发测试学生：

- `E2E_CONCURRENCY_MODEL_JOBS=50`
- `E2E_CONCURRENCY_MODEL_CAPACITY_REQUESTS=50`
- `E2E_CONCURRENCY_PDF_JOBS=12`
- `E2E_CONCURRENCY_PDF_STUDENTS=50`
- `E2E_CONCURRENCY_PDF_QUEUE_TIMEOUT_MS=60000`
- `E2E_CONCURRENCY_EXPECT_PDF_503=0`
- `DB_CONNECTION_LIMIT=140`

其中 `E2E_CONCURRENCY_EXPECT_PDF_503=0` 表示服务器压力档允许 50 个 PDF 请求全部在队列内成功，不强制要求出现 `503`。

运行前确认 MariaDB/MySQL `max_connections >= 140`，建议 `200+`。

常用环境变量：

```bash
E2E_CONCURRENCY_MODEL_JOBS=2
E2E_CONCURRENCY_MODEL_CAPACITY_REQUESTS=2
E2E_CONCURRENCY_PDF_JOBS=1
E2E_CONCURRENCY_PDF_STUDENTS=4
E2E_CONCURRENCY_PDF_QUEUE_TIMEOUT_MS=1
E2E_CONCURRENCY_EXPECT_PDF_503=1
E2E_CONCURRENCY_BACKEND_PORT=54108
E2E_CONCURRENCY_AUTO_PREPARE=1
E2E_CONCURRENCY_AUTO_START_BACKEND=1
```

## 测试配置

### 配置文件

| 配置文件 | 后端端口 | 前端端口 |
|---------|:-------:|:-------:|
| `playwright.admin.config.ts` | 54101 | 55101 |
| `playwright.teacher.config.ts` | 54102 | 55102 |
| `playwright.assistant.config.ts` | 54103 | 55103 |
| `playwright.shiyan.config.ts` | 54104 | 55104 |
| `playwright.session.config.ts` | 54105 | 55105 |
| `playwright.teacher.multiclass.config.ts` | 54106 | 55106 |
| `playwright.shiyan-concurrency-ui.config.ts` | 54118 | 55118 |
| `playwright.quiz.config.ts` | 54126 | 55126 |

各角色使用独立端口，互不冲突。

### 测试数据

- `tests/e2e/fixtures.ts` - 自动生成的共享常量（`bun run e2e:gen`）
- `tests/e2e/helpers/` - 工具函数和选择器
- `tests/e2e/fixtures/` - Playwright fixtures 封装（portal 与 shiyan 分开）
- `tests/e2e/factories/StudentFactory.ts` - 基于种子数据的学生查询工厂
- `tests/e2e/setup/` - 各角色 `globalSetup` 与数据库/种子工具
- `${E2E_BACKEND_DIR:-../fzbe}/scripts/e2e-seed-*.ts` - 后端数据种子脚本

### 环境变量

```bash
# 后端路径（可选；相对路径按前端仓库根目录解析，未配置时自动识别 ../fzbe）
E2E_BACKEND_DIR=../fzbe

# 数据库配置（从 be/.env 读取）
DB_HOST=localhost
DB_USER=fangzhen
DB_PASSWORD=111111
DB_DATABASE=fangzhen001

# 测试账户（可覆盖）
E2E_TEACHER_USERNAME=teacher1
E2E_TEACHER_PASSWORD=TeacherE2E!234
E2E_ASSISTANT_USERNAME=assistant2
E2E_ASSISTANT_PASSWORD=AssistantE2E!234
```

## 目录结构

```text
.
├── scripts/
│   └── shiyan-concurrency-suite.ts # API 级并发回归入口
└── tests/e2e/
    ├── fixtures.ts             # e2e:gen 生成的共享常量（被 .gitignore 忽略）
    ├── generated/              # 生成的 JSON 调试产物
    ├── fixtures/               # Playwright fixtures（base.ts / shiyan.ts / index.ts）
    ├── helpers/                # 通用 helper、选择器、API 辅助
    ├── factories/              # 面向种子数据的数据工厂
    ├── setup/                  # globalSetup 与数据库/种子初始化
    ├── teacher/ assistant/     # 各角色 portal E2E 与 smoke
    ├── admin/ shiyan/          # 管理员与学生端 E2E 与 smoke
    └── shiyan-concurrency-ui/  # 真实浏览器并发回归
```

## 编写新测试

- 教师、助教、管理员端优先复用 `tests/e2e/helpers` 里的导航、登录、表格和 modal helper，不要在 spec 里重新拼 DOM 流程。
- 学生端优先复用 `tests/e2e/shiyan/fixtures.ts` 暴露的 `studentApi`、`studentApp` 等 fixture。
- 需要读取种子学生或按状态/标签取样时，使用 `StudentFactory`；需要通过 API 快速准备数据时，优先用 `helpers/api-helpers.ts` 或 `helpers/index.ts` 的重导出。
- 变更后端 E2E 种子后，先运行 `bun run e2e:gen`，再跑对应角色套件，确保 `tests/e2e/fixtures.ts` 与后端数据同步。

示例：

```typescript
import { expect, test, loginAs, tableRowByText, StudentFactory } from "../helpers";

test("教师可以查看待评阅学生", async ({ page }) => {
  await loginAs(page, { username: "teacher1", password: "TeacherE2E!234", role: "teacher" });
  const studentId = StudentFactory.byStatus("pending_review")[0];
  await expect(tableRowByText(page, studentId)).toBeVisible();
});
```

## 调试测试

### 查看测试报告

```bash
bunx playwright show-report playwright-report/teacher
bunx playwright show-report playwright-report/admin
```

### 交互式调试

```bash
# headed 模式
bun run e2e:teacher:headed

# 单步调试
bunx playwright test --config=playwright.teacher.config.ts --debug
```

### 查看 Trace

```bash
bunx playwright show-trace test-results/teacher/<test-name>/trace.zip
```

## 常见问题

### 端口冲突

各角色使用独立端口，一般不会冲突。如果手动杀进程：

```bash
# 查找占用端口的进程
lsof -i :54101
# 杀掉进程
kill <PID>
```

### 数据库连接失败

```bash
cd "${E2E_BACKEND_DIR:-../fzbe}"
bun run db:reset --force
```
