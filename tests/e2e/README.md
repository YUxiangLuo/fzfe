# Frontend E2E

## 目标

- 为 `admin` 与 `teacher` 端建立统一的端到端测试基础设施。
- 当前提供一组可稳定运行的 smoke 用例，覆盖鉴权与核心页面流转。

## 当前覆盖

- `tests/e2e/admin/guard.spec.ts`
  - 未登录访问 `/admin` 会跳转到 `/login.html`
  - 非 `Admin` 角色访问 `/admin` 会跳转到 `/login.html`
- `tests/e2e/admin/navigation.spec.ts`
  - 管理端核心模块可切换：实验数据、实验手册、用户管理、班级管理
  - 用户管理可新增教师并刷新列表
  - 用户管理可通过 CSV 批量添加教师（测试中使用临时落盘 CSV 文件）
- `tests/e2e/teacher/guard.spec.ts`
  - 未登录访问 `/teacher` 会跳转到 `/login.html`
  - 非 `Teacher/Assistant` 角色访问 `/teacher` 会跳转到 `/login.html`
  - `Assistant` 直接访问 `#/account-assistant` 会被重定向到 `#/account-personal`
- `tests/e2e/teacher/navigation.spec.ts`
  - 教师端核心模块可切换：实验进度/报告/日志、班级管理、学生管理、题库管理、账户页
  - 班级管理可新增班级并刷新列表
  - 班级管理可上传 CSV 学生名单创建班级（测试中使用临时落盘 CSV 文件）

## 运行方式

```bash
npm run test:e2e:admin
```

```bash
npm run test:e2e:teacher
```

或运行全部 e2e：

```bash
npm run test:e2e
```

## 环境变量（可选）

- `E2E_HOST`：默认 `127.0.0.1`
- `E2E_PORT`：默认 `3000`
- `E2E_BASE_URL`：默认 `http://127.0.0.1:3000`
- `E2E_SKIP_WEBSERVER`：设为 `1` 时不自动拉起 `vite`（用于你手动启动服务或 CI 特殊环境）

> 当前 smoke 用例采用前端 mock API，不依赖后端测试库。  
> 当准备做完整联调 e2e 时，建议新增一套 `live` 用例并接入后端 seed/reset。

## 下一步建议

1. 增加“删除用户后分页回退”的回归用例。
2. 增加“手册上传/启用切换”和“数据集上传/编辑/删除”的用例。
3. 增加 live 模式用例（真实后端 + 测试数据重置脚本）。
