import React from "react";
import { AlertTriangle } from "lucide-react";
import Button from "./Button";

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
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      iconColor: "text-red-600",
      bgColor: "bg-red-50",
      buttonClass: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    },
    warning: {
      iconColor: "text-yellow-600",
      bgColor: "bg-yellow-50",
      buttonClass: "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500",
    },
    info: {
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      buttonClass: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onCancel}
        ></div>

        {/* Dialog */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="p-6">
            {/* Icon and Title */}
            <div className="flex items-start space-x-3 mb-4">
              <div className={`flex-shrink-0 w-10 h-10 ${variantConfig.bgColor} rounded-full flex items-center justify-center`}>
                <AlertTriangle className={`w-5 h-5 ${variantConfig.iconColor}`} />
              </div>
              <div className="flex-1">
                <h3 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={onCancel}>
                {cancelText}
              </Button>
              <Button
                onClick={onConfirm}
                className={variantConfig.buttonClass}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
