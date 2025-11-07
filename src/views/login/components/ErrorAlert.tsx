import React from "react";
import { AlertCircle } from "lucide-react";

interface ErrorAlertProps {
  message: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message }) => {
  return (
    <div
      className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm rounded-lg p-3 flex items-center space-x-2"
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
};
