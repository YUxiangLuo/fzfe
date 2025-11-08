import { useState, useCallback, useRef } from "react";

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  variant?: "danger" | "warning" | "info";
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    message: "",
    variant: "warning",
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      variant: "danger" | "warning" | "info" = "warning"
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        setConfirmState({
          isOpen: true,
          title,
          message,
          variant,
        });
      });
    },
    []
  );

  const hideConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    hideConfirm();
  }, [hideConfirm]);

  const handleCancel = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    hideConfirm();
  }, [hideConfirm]);

  return {
    isOpen: confirmState.isOpen,
    title: confirmState.title,
    message: confirmState.message,
    variant: confirmState.variant,
    showConfirm,
    hideConfirm,
    handleConfirm,
    handleCancel,
  };
};
