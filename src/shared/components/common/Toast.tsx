import React, { useEffect } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  onClose,
  duration = 3000,
  position = "top-right",
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      bgColor: "bg-green-500/90",
      icon: CheckCircle,
      iconColor: "text-green-100",
    },
    error: {
      bgColor: "bg-red-500/90",
      icon: AlertCircle,
      iconColor: "text-red-100",
    },
    info: {
      bgColor: "bg-blue-500/90",
      icon: Info,
      iconColor: "text-blue-100",
    },
  }[type];

  const Icon = config.icon;
  const positionClasses = {
    "top-right": "top-20 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  }[position];

  return (
    <div
      className={`fixed ${positionClasses} z-50 ${config.bgColor} text-white px-6 py-4 rounded-lg shadow-2xl backdrop-blur-sm animate-slide-in-top flex items-center space-x-3 min-w-[300px] max-w-md`}
      role="alert"
      aria-live="polite"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} />
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:bg-white/20 rounded p-1 transition-colors"
        aria-label="关闭通知"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
