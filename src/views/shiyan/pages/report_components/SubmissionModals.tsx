import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface CompletionModalProps {
  countdown: number;
  onLogout: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({ countdown, onLogout }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
      <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">恭喜！实验完成</h2>
      <p className="text-gray-600 mb-6">您的实验报告已成功提交并保存。</p>
      <div className="space-y-3">
        <button
          onClick={onLogout}
          className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          退出登录 ({countdown})
        </button>
      </div>
    </div>
  </div>
);

interface ValidationErrorModalProps {
  onClose: () => void;
}

export const ValidationErrorModal: React.FC<ValidationErrorModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
      <div className="mx-auto flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
        <AlertTriangle className="w-10 h-10 text-yellow-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">内容不完整</h2>
      <p className="text-gray-600 mb-6">
        请检查并确保所有部分的分析内容都已填写。
      </p>
      <button
        onClick={onClose}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
      >
        返回修改
      </button>
    </div>
  </div>
);
