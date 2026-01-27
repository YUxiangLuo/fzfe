import { useCallback } from "react";
import { toast } from "sonner";

type ToastType = "success" | "error" | "info";

export const useToast = () => {
  const showToast = useCallback((message: string, type: ToastType = "info") => {
    toast[type](message);
  }, []);

  return { showToast };
};
