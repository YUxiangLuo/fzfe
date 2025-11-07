import { useState, useCallback } from "react";

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  variant?: "danger" | "warning" | "info";
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "warning",
  });

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      variant: "danger" | "warning" | "info" = "warning"
    ) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        onConfirm,
        variant,
      });
    },
    []
  );

  const hideConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    confirmState.onConfirm();
    hideConfirm();
  }, [confirmState, hideConfirm]);

  return {
    confirmState,
    showConfirm,
    hideConfirm,
    handleConfirm,
  };
};
