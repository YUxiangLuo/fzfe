import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "small" | "medium" | "large" | "fullscreen";
  closeOnBackdropClick?: boolean;
}

const sizeClassMap: Record<NonNullable<ModalProps["size"]>, string> = {
  small: "sm:max-w-md",
  medium: "sm:max-w-2xl",
  large: "sm:max-w-6xl",
  fullscreen: "w-full max-w-none h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] lg:h-[calc(100vh-200px)]",
};

const TeacherModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "medium",
  closeOnBackdropClick = true,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent
        className={cn(sizeClassMap[size])}
        onPointerDownOutside={(event) => {
          if (!closeOnBackdropClick) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (!closeOnBackdropClick) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className={size === "fullscreen" ? "flex-1 overflow-y-auto" : ""}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherModal;
