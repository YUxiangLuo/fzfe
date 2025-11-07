import { useState, useCallback } from 'react';
import type { ToastType } from '../components/Common/Toast';

interface ToastState {
  isVisible: boolean;
  message: string;
  type: ToastType;
}

export const useToast = () => {
  const [state, setState] = useState<ToastState>({
    isVisible: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setState({
      isVisible: true,
      message,
      type,
    });
  }, []);

  const hideToast = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isVisible: false,
    }));
  }, []);

  return {
    ...state,
    showToast,
    hideToast,
  };
};
