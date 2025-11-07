# API超时策略说明

## 概述

本项目实现了**基于端点的智能超时策略**，根据不同API端点的特性自动设置合适的超时时间，确保在保护用户免受网络问题影响的同时，不会干扰正常的长时间操作。

## 超时时间配置

### 无超时 (undefined)

适用于可能需要数分钟才能完成的操作：

- **模型训练** - `/models/*/training`
  - 机器学习模型（MA、ES、ARIMA、LSTM、集成模型）的训练
  - 可能需要30秒到几分钟不等

### 60秒超时

适用于复杂计算但通常能在1分钟内完成的操作：

- **模型预测** - 包含 `predict` 或 `forecast` 的端点
  - 需求预测、销量预测等
- **生产计划计算** - `/production/*/calculate`
  - 生产计划优化算法
  - MPS（主生产计划）计算

### 30秒超时

适用于文件传输操作：

- **文件上传** - 包含 `upload` 或 `import` 的端点
  - CSV文件导入
  - 批量数据上传

### 15秒超时

适用于数据加载操作：

- **数据集加载** - `/datasets/*`、包含 `sales` 或 `historical` 的端点
  - 历史销售数据
  - 产品数据集
  - 月度销量数据

### 10秒超时 (默认)

适用于所有其他API调用：

- **用户认证** - `/auth/*`, `/users/me`
- **CRUD操作** - 创建、读取、更新、删除
- **配置获取** - 系统配置、用户偏好设置
- **其他所有未特别指定的端点**

## 实现原理

### 核心函数：`getTimeoutForEndpoint()`

```typescript
const getTimeoutForEndpoint = (endpoint: string): number | undefined => {
  const lowerEndpoint = endpoint.toLowerCase();

  // 按优先级检查端点类型
  if (lowerEndpoint.includes('/models/') && lowerEndpoint.includes('/training')) {
    return undefined; // 无超时
  }

  if (lowerEndpoint.includes('/predict') || lowerEndpoint.includes('/forecast')) {
    return 60000; // 60秒
  }

  // ... 其他规则

  return 10000; // 默认10秒
};
```

### 自动超时控制

```typescript
const request = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
  isFormData = false,
): Promise<T> => {
  // 自动确定超时时间
  const timeout = getTimeoutForEndpoint(endpoint);

  if (timeout !== undefined) {
    // 使用 AbortController 实现超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(buildUrl(endpoint), {
        ...config,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return handleResponse<T>(response, endpoint);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`请求超时（${timeout / 1000}秒），请检查网络连接后重试`);
      }
      throw err;
    }
  }

  // 无超时控制（用于模型训练等）
  const response = await fetch(buildUrl(endpoint), config);
  return handleResponse<T>(response, endpoint);
};
```

## 错误处理

### 超时错误消息

当请求超时时，用户会看到清晰的错误消息：

```
请求超时（10秒），请检查网络连接后重试
```

消息中包含超时时长，帮助用户理解问题。

### Toast通知集成

各个SPA模块已集成Toast通知系统，超时错误会以友好的方式展示：

```typescript
try {
  const data = await apiClient.get('/some/endpoint');
} catch (error: unknown) {
  if (error instanceof Error) {
    toast.showToast(error.message, 'error'); // 显示超时错误
  }
}
```

## 使用示例

### 示例1：普通CRUD操作（10秒超时）

```typescript
// GET /users/me - 自动应用10秒超时
const user = await apiClient.get('/users/me');
```

### 示例2：数据加载（15秒超时）

```typescript
// GET /datasets/industries/汽车制造/companies/长安汽车/products/发动机/sales
// 自动应用15秒超时
const salesData = await apiClient.get(endpoint);
```

### 示例3：模型训练（无超时）

```typescript
// POST /models/lstm/training - 无超时限制
const result = await apiClient.post('/models/lstm/training', {
  // ... 训练参数
});
// 可能需要几分钟，不会超时
```

### 示例4：手动控制（可选）

如果需要手动控制超时，可以传入自己的AbortController：

```typescript
const controller = new AbortController();
const customTimeoutId = setTimeout(() => controller.abort(), 5000); // 自定义5秒

try {
  const data = await apiClient.get('/some/endpoint', {
    signal: controller.signal
  });
  clearTimeout(customTimeoutId);
} catch (error) {
  clearTimeout(customTimeoutId);
  // 处理错误
}
```

## 优势

1. **自动化**：开发者无需手动为每个API调用设置超时
2. **智能化**：根据操作类型自动选择合适的超时时间
3. **灵活性**：支持手动覆盖（通过传入signal）
4. **用户友好**：清晰的错误消息，包含超时时长信息
5. **可维护性**：集中管理所有超时策略，易于调整

## 调整超时策略

如果需要调整超时时间或添加新的规则，只需修改 `src/utils/apiClient.ts` 中的 `getTimeoutForEndpoint()` 函数：

```typescript
const getTimeoutForEndpoint = (endpoint: string): number | undefined => {
  // 添加新规则
  if (endpoint.includes('/new-feature/')) {
    return 20000; // 20秒
  }

  // ... 现有规则
};
```

## 监控和日志

超时相关的信息会记录在浏览器控制台中：

- 正常完成的请求不会有额外日志
- 超时的请求会触发 `AbortError` 并被转换为友好的错误消息
- 可以通过 `console.error()` 查看详细的网络错误信息

## 注意事项

1. **模型训练期间**：不要关闭浏览器标签页，训练过程没有超时限制但仍需网络连接
2. **网络不稳定时**：可能会看到更多的超时错误，这是正常的保护机制
3. **后端响应时间**：如果后端经常超过超时限制，可能需要优化后端性能或调整超时时间

## 版本历史

- **v1.0** (2025-01-XX): 初始版本，实现基于端点的智能超时策略
  - 支持5种不同的超时时间配置
  - 集成到所有SPA模块（login、jiaoshi、zhujiao、shiyan）
  - 支持手动覆盖
