# E2E 测试指南

## 快速开始

### 运行所有测试

```bash
bun run e2e:all
```

### 运行特定测试套件

```bash
bun run e2e:teacher
bun run e2e:assistant
bun run e2e:admin
bun run e2e:shiyan
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
| `bun run e2e:teacher` | 运行教师端测试 |
| `bun run e2e:teacher:headed` | 教师端测试（带浏览器界面） |
| `bun run e2e:assistant` | 运行助教端测试 |
| `bun run e2e:assistant:headed` | 助教端测试（带浏览器界面） |
| `bun run e2e:admin` | 运行管理员端测试 |
| `bun run e2e:admin:headed` | 管理员端测试（带浏览器界面） |
| `bun run e2e:shiyan` | 运行学生端测试 |
| `bun run e2e:shiyan:headed` | 学生端测试（带浏览器界面） |
| `bun run e2e:all` | 运行所有 E2E 测试 |

## 测试配置

### 配置文件

| 配置文件 | 后端端口 | 前端端口 |
|---------|:-------:|:-------:|
| `playwright.admin.config.ts` | 54101 | 55101 |
| `playwright.teacher.config.ts` | 54102 | 55102 |
| `playwright.assistant.config.ts` | 54103 | 55103 |
| `playwright.shiyan.config.ts` | 54104 | 55104 |

各角色使用独立端口，互不冲突。

### 测试数据

- `tests/e2e/fixtures.ts` - 自动生成的共享常量（`bun run e2e:gen`）
- `tests/e2e/helpers/` - 工具函数和选择器
- `../be/scripts/e2e-seed-*.ts` - 后端数据种子脚本

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
cd ../be
bun run db:reset --force
```

## 编写新测试

参考现有测试文件，使用共享工具函数：

```typescript
import { expect, test } from "@playwright/test";
import { loginAs, tableRowByText, expectSuccessMessage, ACCOUNTS } from "../helpers";
```
