# Experiment Store 说明

## 当前状态

学生实验端已经完成从旧 React Context 到 Zustand store 的迁移。当前入口在 `src/views/shiyan/App.tsx` 中使用：

```tsx
import { ExperimentStoreProvider } from "./contexts/ExperimentStoreProvider";

<ExperimentStoreProvider>
  <AppRoutes />
</ExperimentStoreProvider>
```

旧的 `ExperimentContext.tsx` 已不存在。不要再新增对旧 Context provider 的依赖。

## 主要文件

- `src/views/shiyan/store/experiment/`：实验状态、UI 状态、状态迁移、同步控制器和资源加载控制器。
- `src/views/shiyan/contexts/ExperimentStoreProvider.tsx`：负责初始化 store，并自动加载产品销量数据和字段选项。
- `src/views/shiyan/contexts/ExperimentContext.zustand.tsx`：兼容层，继续向页面组件导出 `useExperiment`、`useExperimentStore` 和相关类型。

## 组件用法

现有页面组件通常从兼容层读取实验状态：

```tsx
import { useExperiment } from "../contexts/ExperimentContext.zustand";

function MyComponent() {
  const { state, ui, updateState } = useExperiment();
  return <div>{state.selected_industry}</div>;
}
```

需要精确订阅单个字段时，可以直接使用 `useExperimentStore`：

```tsx
import { useExperimentStore } from "../contexts/ExperimentContext.zustand";

function LoadingIndicator() {
  const loading = useExperimentStore((store) => store.ui.loading);
  return loading ? <span>加载中...</span> : null;
}
```

## 维护规则

- 新代码优先复用 `store/experiment` 中已有的 transition、sync controller 和 reset patch。
- 页面组件如果只需要少量字段，优先使用 selector，避免订阅整个 store。
- `ExperimentContext.zustand.tsx` 是兼容导出层，不应承载新的业务逻辑。
- 修改状态结构后，同步更新 `store/experiment/types.ts`、相关 transition 测试和页面服务测试。

## 回归测试

修改实验状态逻辑后，至少运行：

```bash
bun test src/views/shiyan/store/experiment
bun test src/views/shiyan/services
bun run typecheck
```

涉及真实实验流程时，再运行学生端 e2e：

```bash
bun run e2e:shiyan
```
