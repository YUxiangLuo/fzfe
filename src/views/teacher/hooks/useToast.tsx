import { useCallback } from "react";
import { toast as sonnerToast } from "sonner";

export const useToast = () => {
  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      if (type === "success") {
        sonnerToast.success(message);
        return;
      }
      if (type === "error") {
        sonnerToast.error(message);
        return;
      }
      sonnerToast.info(message);
    },
    [],
  );

  return {
    toast: null,
    showToast,
    hideToast: () => {},
  };
};