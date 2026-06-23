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
| `bun run e2e:shiyan:parallel5` | 5 名学生完整 shiyan 并发流程 |
| `bun run e2e:shiyan:parallel20-training` | 20 名学生并发训练与 `429`/重试验证 |
| `bun run e2e:shiyan:parallel20-production` | 20 名学生并发生产计划预测与 `429`/重试验证 |
| `bun run e2e:shiyan:slot-lock` | 单学生训练页稳定复现模型 slot `429` |
| `bun run e2e:shiyan:production-slot-lock` | 单学生生产计划页稳定复现模型 slot `429` |
| `bun run e2e:session` | 运行学生会话恢复测试 |
| `bun run e2e:quiz` | 运行题库相关测试 |
| `bun run e2e:all` | 运行主线 E2E 套件（teacher/assistant/admin/shiyan/session） |

## Smoke 与全量套件

- `smoke` 覆盖教师、助教、管理员、学生四个角色的核心入口链路，适合快速判断系统主流程是否可用。
- `smoke` 脚本会先执行一次 `bun run e2e:gen`，确保在干净环境里也能拿到 `tests/e2e/fixtures.ts` 这份生成常量。
- `smoke` 仍会启动 `../fangzhen-be` 后端，并通过 Playwright `globalSetup` 重置数据库。
- 全量套件继续覆盖 CRUD、导出、分页和复杂边缘场景，适合在完整环境下回归。
- 各 Playwright 配置都会执行各自的数据库重置流程，不要手动并行启动多个套件；仓库内脚本默认按顺序执行。

## Shiyan 并发与锁测试脚本

这些脚本位于 `scripts/`，不是 `bunx playwright test` 风格的 spec，而是面向当前并发 seed 的独立 Playwright 入口。它们默认复用学生端 E2E 的前后端端口：

- 前端 `55104`
- 后端 `54104`

默认会自动准备并发数据，并在需要时启动 `../fangzhen-be` 后端和当前前端服务；如需复用已有服务，可设置 `E2E_PARALLEL_AUTO_PREPARE=0` 或 `E2E_PARALLEL_AUTO_START_SERVERS=0`。

### 5 学生完整并发流程

脚本：`bun run e2e:shiyan:parallel5`

用途：

- 5 名学生从登录一直跑到提交报告
- 适合验证完整主流程、教师端报告记录、最终实验完成状态

推荐前置：

```bash
cd ../fangzhen-be
bun run seed:parallel:scenario start-only --force
```

常用环境变量：

```bash
E2E_PARALLEL_STUDENTS=20246001,20246002,20246003,20246004,20246005
E2E_PARALLEL_REPORT_STAGGER_MS=0
PW_HEADLESS=false
PW_SLOWMO=100
```

### 20 学生并发训练

脚本：`bun run e2e:shiyan:parallel20-training`

用途：

- 20 名学生从 step 5 同时触发 `POST /api/v1/models/ma/training`
- 首轮用 Playwright barrier 对齐请求
- 校验首轮至少出现一批 `429`
- 自动对命中 `429` 的学生点击 `重试`，直到全部训练成功或达到上限

推荐前置：

```bash
cd ../fangzhen-be
bun run seed:parallel:scenario training-burst --force
```

常用环境变量：

```bash
E2E_PARALLEL20_RETRY_BUSY_429=1
E2E_PARALLEL20_MAX_RETRY_ROUNDS=8
E2E_PARALLEL20_RETRY_ROUND_DELAY_MS=250
PW_HEADLESS=false
E2E_AGENT_BROWSER_WAIT_FOR_ATTACH=1
E2E_AGENT_BROWSER_HOLD_AFTER_RESULTS_MS=15000
```

输出：

- `test-results/shiyan-training-burst-twenty/summary.json`

### 20 学生并发生产计划预测

脚本：`bun run e2e:shiyan:parallel20-production`

用途：

- 20 名学生在 `#/production/steps` 同时点击“预测第一期需求”
- 首轮对齐 `POST /api/v1/models/ma/prepare-production`
- 校验生产计划阶段的 `429`
- 自动对命中 `429` 的学生重试，直到全部预测成功或达到上限

默认行为：

- 会把当前 20 名学生提升到生产计划阶段
- 默认先执行一次 20 人训练准备，确保每个学生都有回测模型 artifact

常用环境变量：

```bash
E2E_PARALLEL20_PRODUCTION_PREPARE_SCENARIO=1
E2E_PARALLEL20_PRODUCTION_PREPARE_TRAINING=1
E2E_PARALLEL20_PRODUCTION_RETRY_BUSY_429=1
E2E_PARALLEL20_PRODUCTION_MAX_RETRY_ROUNDS=8
E2E_PARALLEL20_PRODUCTION_RETRY_ROUND_DELAY_MS=250
PW_HEADLESS=false
E2E_AGENT_BROWSER_WAIT_FOR_ATTACH=1
E2E_AGENT_BROWSER_HOLD_AFTER_RESULTS_MS=15000
```

注意：

- `E2E_PARALLEL20_PRODUCTION_PREPARE_SCENARIO=1` 不能和 `E2E_PARALLEL20_PRODUCTION_PREPARE_TRAINING=0` 一起用；前者会把实验重置回 `training-burst`，这时已经没有可复用的训练产物。

如果当前 20 名学生已经完成并发训练，可跳过训练准备：

```bash
E2E_PARALLEL20_PRODUCTION_PREPARE_TRAINING=0 bun run e2e:shiyan:parallel20-production
```

输出：

- `test-results/shiyan-production-burst-twenty/summary.json`

### 单学生稳定复现 `429`

脚本：

- `bun run e2e:shiyan:slot-lock`
- `bun run e2e:shiyan:production-slot-lock`

用途：

- 先预占满后端当前全部 model slot，再让一个真实学生进入训练页或生产计划页
- 适合稳定复现 `429`，排查 UI 提示、console、agent-browser 观察点

常用启动方式：

```bash
PW_HEADLESS=false E2E_AGENT_BROWSER_WAIT_FOR_ATTACH=1 bun run e2e:shiyan:slot-lock
PW_HEADLESS=false E2E_AGENT_BROWSER_WAIT_FOR_ATTACH=1 bun run e2e:shiyan:production-slot-lock
```

### Agent-browser 联调

带 `E2E_AGENT_BROWSER_WAIT_FOR_ATTACH=1` 的脚本会在浏览器打开后暂停，并打印建议命令。常用流程：

```bash
agent-browser connect 9222
agent-browser tab list
agent-browser tab 3
agent-browser snapshot -i
agent-browser console --clear
```

注意：

- `parallel20-training` 和 `parallel20-production` 默认只把一个浏览器通过 `9222` 暴露给 `agent-browser`
- `agent-browser network requests` 在 CDP 复用场景下可能抓不到完整缓冲；必要时可改用 `console`、`snapshot`，或用页面内 `performance` 读取资源记录

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
| `playwright.quiz.config.ts` | 54126 | 55126 |

各角色使用独立端口，互不冲突。

### 测试数据

- `tests/e2e/fixtures.ts` - 自动生成的共享常量（`bun run e2e:gen`）
- `tests/e2e/helpers/` - 工具函数和选择器
- `tests/e2e/fixtures/` - Playwright fixtures 封装（portal 与 shiyan 分开）
- `tests/e2e/factories/StudentFactory.ts` - 基于种子数据的学生查询工厂
- `tests/e2e/setup/` - 各角色 `globalSetup` 与数据库/种子工具
- `../fangzhen-be/scripts/e2e-seed-*.ts` - 后端数据种子脚本

### 环境变量

```bash
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
tests/e2e/
├── fixtures.ts             # e2e:gen 生成的共享常量（被 .gitignore 忽略）
├── generated/              # 生成的 JSON 调试产物
├── fixtures/               # Playwright fixtures（base.ts / shiyan.ts / index.ts）
├── helpers/                # 通用 helper、选择器、API 辅助
├── factories/              # 面向种子数据的数据工厂
├── setup/                  # globalSetup 与数据库/种子初始化
├── teacher/ assistant/     # 各角色 portal E2E 与 smoke
├── admin/ shiyan/          # 管理员与学生端 E2E 与 smoke
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
cd ../fangzhen-be
bun run db:reset --force
```
