import React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const maxWidthClasses: Record<string, string> = {
  "max-w-md": "sm:max-w-md",
  "max-w-lg": "sm:max-w-lg",
  "max-w-xl": "sm:max-w-xl",
  "max-w-2xl": "sm:max-w-2xl",
  "max-w-3xl": "sm:max-w-3xl",
  "max-w-4xl": "sm:max-w-4xl",
  "max-w-5xl": "sm:max-w-5xl",
  "max-w-6xl": "sm:max-w-6xl",
  "max-w-7xl": "sm:max-w-7xl",
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={maxWidthClasses[maxWidth] ?? "sm:max-w-md"}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        <DialogClose className="sr-only">关闭</DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
