import React, { useRef } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

const mediaClasses: Record<NonNullable<ConfirmDialogProps["variant"]>, string> = {
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  info: "bg-primary/10 text-primary",
};

const actionVariant: Record<NonNullable<ConfirmDialogProps["variant"]>, "default" | "destructive"> = {
  danger: "destructive",
  warning: "default",
  info: "default",
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = "确定",
  cancelText = "取消",
  onConfirm,
  onCancel,
  variant = "warning",
}) => {
  const confirmInitiatedRef = useRef(false);
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          confirmInitiatedRef.current = false;
          return;
        }
        if (!confirmInitiatedRef.current) {
          onCancel();
        }
        confirmInitiatedRef.current = false;
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className={cn(mediaClasses[variant])}>
            <AlertTriangle className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            variant={actionVariant[variant]}
            onClick={() => {
              confirmInitiatedRef.current = true;
              onConfirm();
            }}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
