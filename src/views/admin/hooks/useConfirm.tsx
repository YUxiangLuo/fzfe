import { useState, useCallback } from 'react';

interface ConfirmState {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

const defaultState: ConfirmState = {
  isOpen: false,
  message: '',
  onConfirm: () => {},
};

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<ConfirmState>(defaultState);

  const showConfirm = useCallback(
    (
      message: string,
      onConfirm: () => void,
      options?: {
        title?: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'danger' | 'warning' | 'info';
      }
    ) => {
      setConfirmState({
        isOpen: true,
        message,
        onConfirm,
        title: options?.title,
        confirmText: options?.confirmText,
        cancelText: options?.cancelText,
        variant: options?.variant || 'warning',
      });
    },
    []
  );

  const hideConfirm = useCallback(() => {
    setConfirmState(defaultState);
  }, []);

  return {
    confirmState,
    showConfirm,
    hideConfirm,
  };
};
