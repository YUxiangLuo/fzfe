# E2E 测试指南

## 快速开始

### 运行所有测试

```bash
# 使用脚本（推荐）
bun run e2e:all

# 或使用原始命令
bunx playwright test --config=playwright.teacher.config.ts
bunx playwright test --config=playwright.assistant.config.ts
```

### 运行特定测试套件

```bash
# 运行 Teacher 测试
bun run e2e:teacher

# 运行 Assistant 测试
bun run e2e:assistant

# 清理端口（如果遇到端口冲突）
bun run e2e:clean
```

### 运行特定测试用例

```bash
# 使用脚本运行特定测试
./scripts/run-e2e.sh teacher "班级管理"
./scripts/run-e2e.sh assistant "实验报告"

# 或使用 bun
bunx playwright test --config=playwright.teacher.config.ts --grep "班级管理"
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `bun run e2e` | 显示帮助信息 |
| `bun run e2e:teacher` | 运行教师端 E2E 测试 |
| `bun run e2e:assistant` | 运行助教端 E2E 测试 |
| `bun run e2e:all` | 运行所有 E2E 测试 |
| `bun run e2e:clean` | 清理测试端口和进程 |

## 测试配置

### 配置文件

- `playwright.teacher.config.ts` - 教师端测试配置
- `playwright.assistant.config.ts` - 助教端测试配置
- `playwright.admin.config.ts` - 管理员端测试配置
- `playwright.shiyan.config.ts` - 学生端测试配置

### 测试数据

测试数据通过以下文件管理：

- `tests/e2e/fixtures.ts` - 共享常量（账户、测试数据、API 端点）
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

# 端口配置
E2E_BACKEND_PORT=54102  # Teacher
E2E_FRONTEND_PORT=55102
```

## 调试测试

### 查看测试报告

```bash
# HTML 报告
playwright show-report playwright-report/teacher
playwright show-report playwright-report/assistant

# 查看失败截图和视频
ls test-results/teacher/
ls test-results/assistant/
```

### 交互式调试（ headed 模式）

```bash
# 带界面的测试运行
bunx playwright test --config=playwright.teacher.config.ts --headed

# 单步调试
bunx playwright test --config=playwright.teacher.config.ts --debug
```

### 查看 Trace

```bash
# 启动 Trace 查看器
npx playwright show-trace test-results/teacher/<test-name>/trace.zip
```

## 常见问题

### 端口冲突

如果遇到端口占用错误，运行：
```bash
bun run e2e:clean
```

### 数据库连接失败

确保后端数据库已正确配置：
```bash
cd ../be
bun run db:setup
```

### 测试超时

可以调整 playwright 配置中的 `timeout` 值：
```typescript
// playwright.teacher.config.ts
export default defineConfig({
  timeout: 120_000,  // 默认 90 秒
});
```

## 编写新测试

参考现有测试文件：

1. `tests/e2e/teacher/teacher.spec.ts` - 教师端测试示例
2. `tests/e2e/assistant/assistant.spec.ts` - 助教端测试示例

使用共享工具函数：
```typescript
import { loginAs, tableRowByText, expectSuccessMessage } from "../helpers";
import { TEST_DATA, ACCOUNTS } from "../fixtures";
```
