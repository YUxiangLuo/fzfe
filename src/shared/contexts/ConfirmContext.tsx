import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return { confirm: context };
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(options);
      resolveRef.current = resolve;
    });
  }, []);

  const handleClose = (value: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(value);
    }
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <ConfirmDialog
          isOpen={!!options}
          title={options.title}
          message={options.message}
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
        />
      )}
    </ConfirmContext.Provider>
  );
};
