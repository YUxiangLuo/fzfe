/**
 * Toast 事件总线
 * 使用 EventEmitter 模式替代模块级可变变量
 * 更符合 React 规范，解耦 Store 和 UI Toast 组件
 */

export type ToastType = 'success' | 'error' | 'info';

export interface ToastEvent {
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastListener = (event: ToastEvent) => void;

/**
 * Toast 事件总线类
 * 实现发布-订阅模式，用于在 Store 中触发 Toast 通知
 */
class ToastEventBus {
  private listeners: Set<ToastListener> = new Set();

  /**
   * 订阅 Toast 事件
   * @param listener 事件监听器
   * @returns 取消订阅的函数
   */
  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 发布 Toast 事件
   * @param event Toast 事件对象
   */
  emit(event: ToastEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[ToastEventBus] Error in listener:', error);
      }
    });
  }

  /**
   * 便捷方法: 发送成功消息
   */
  success(message: string, duration?: number): void {
    this.emit({ message, type: 'success', duration });
  }

  /**
   * 便捷方法: 发送错误消息
   */
  error(message: string, duration?: number): void {
    this.emit({ message, type: 'error', duration });
  }

  /**
   * 便捷方法: 发送信息消息
   */
  info(message: string, duration?: number): void {
    this.emit({ message, type: 'info', duration });
  }

  /**
   * 获取当前订阅者数量 (用于调试)
   */
  get listenerCount(): number {
    return this.listeners.size;
  }
}

/**
 * 单例 Toast 事件总线实例
 * Store 通过此实例发送 Toast，UI 层通过 useToastSubscription Hook 订阅
 */
export const toastEventBus = new ToastEventBus();
