import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "small" | "medium" | "large" | "fullscreen";
  closeOnBackdropClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "medium",
  closeOnBackdropClick = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key and lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    // Lock body scroll
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    // Focus trap - focus first focusable element
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    small: "max-w-md",
    medium: "max-w-2xl",
    large: "max-w-6xl",
    fullscreen: "w-full h-full",
  };

  const containerPadding =
    size === "fullscreen"
      ? "p-6 sm:p-10 md:p-16 lg:p-[100px]"
      : "p-0";

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div
        className={`flex min-h-screen items-center justify-center ${containerPadding}`}
      >
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleBackdropClick}
          aria-hidden="true"
        ></div>
        <div
          ref={modalRef}
          className={`relative bg-white rounded-lg shadow-xl w-full max-h-full ${sizeClasses[size]} flex flex-col`}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <h2 id="modal-title" className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="关闭对话框"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
