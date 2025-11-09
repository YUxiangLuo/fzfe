/**
 * 重试异步函数，支持指数退避
 *
 * @param fn - 要执行的异步函数
 * @param maxRetries - 最大重试次数（默认3次）
 * @param initialDelay - 初始延迟时间（毫秒，默认1000ms）
 * @returns Promise<T>
 *
 * @example
 * const result = await retryAsync(
 *   () => apiCall(),
 *   3,  // 最多重试3次
 *   1000 // 初始延迟1秒
 * );
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 尝试执行函数
      const result = await fn();

      // 成功则返回结果
      if (attempt > 0) {
        console.log(`✅ 重试成功（第${attempt}次尝试）`);
      }
      return result;
    } catch (error) {
      lastError = error;

      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        console.error(`❌ 重试失败：已达到最大重试次数 (${maxRetries})`, error);
        throw error;
      }

      // 计算延迟时间（指数退避：1s, 2s, 4s, 8s...）
      const delay = initialDelay * Math.pow(2, attempt);
      console.warn(`⚠️ 尝试 ${attempt + 1}/${maxRetries + 1} 失败，${delay}ms 后重试...`, error);

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // 理论上不会到这里，但为了类型安全
  throw lastError;
}

/**
 * 重试异步函数，带取消功能
 */
export class RetryableOperation<T> {
  private cancelled = false;

  constructor(
    private fn: () => Promise<T>,
    private maxRetries = 3,
    private initialDelay = 1000
  ) {}

  cancel() {
    this.cancelled = true;
  }

  async execute(): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      // 检查是否取消
      if (this.cancelled) {
        throw new Error('Operation cancelled');
      }

      try {
        const result = await this.fn();
        if (attempt > 0) {
          console.log(`✅ 重试成功（第${attempt}次尝试）`);
        }
        return result;
      } catch (error) {
        lastError = error;

        if (this.cancelled) {
          throw new Error('Operation cancelled');
        }

        if (attempt === this.maxRetries) {
          console.error(`❌ 重试失败：已达到最大重试次数 (${this.maxRetries})`, error);
          throw error;
        }

        const delay = this.initialDelay * Math.pow(2, attempt);
        console.warn(`⚠️ 尝试 ${attempt + 1}/${this.maxRetries + 1} 失败，${delay}ms 后重试...`, error);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
