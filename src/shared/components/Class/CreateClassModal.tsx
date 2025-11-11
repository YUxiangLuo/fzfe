import React, { useState, useRef } from 'react';
import { Upload, FileText, XCircle, AlertTriangle } from 'lucide-react';
import Modal from '@/shared/components/common/Modal';
import Button from '@/shared/components/common/Button';
import { validateClassName, validateClassCode } from '@/shared/utils/validation';
import { useToast } from '@/shared/hooks/useToast';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

interface CreateClassForm {
  class_name: string;
  class_code: string;
}

const MAX_CSV_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const CreateClassModal: React.FC<CreateClassModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<CreateClassForm>({ class_name: '', class_code: '' });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        showToast('请上传 CSV 格式的文件', 'error');
        e.target.value = '';
        return;
      }
      if (file.type && !['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.type)) {
        showToast('文件类型不正确，请上传有效的 CSV 文件', 'error');
        e.target.value = '';
        return;
      }
      if (file.size > MAX_CSV_FILE_SIZE) {
        showToast('文件大小不能超过 5MB', 'error');
        e.target.value = '';
        return;
      }
      setCsvFile(file);
    }
  };

  const handleRemoveFile = () => {
    setCsvFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    const nameValidation = validateClassName(formData.class_name);
    if (!nameValidation.valid) {
      showToast(nameValidation.error || '班级名称格式不正确', 'error');
      return;
    }
    const codeValidation = validateClassCode(formData.class_code);
    if (!codeValidation.valid) {
      showToast(codeValidation.error || '班级代码格式不正确', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('class_name', formData.class_name.trim());
      formDataToSend.append('class_code', formData.class_code.trim());
      if (csvFile) {
        formDataToSend.append('student_list', csvFile);
      }
      await onSubmit(formDataToSend);
      // Reset form state after successful submission, which is handled by the parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="新增班级">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            班级名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.class_name}
            onChange={(e) => setFormData(prev => ({ ...prev, class_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例如：2024级计算机1班"
            maxLength={50}
          />
          <p className="mt-1 text-xs text-gray-500">
            2-50个字符，可包含中文、英文、数字、短横线和下划线
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            班级代码 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.class_code}
            onChange={(e) => setFormData(prev => ({ ...prev, class_code: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例如：CS101-2025"
            maxLength={20}
          />
          <p className="mt-1 text-xs text-gray-500">
            2-20个字符，只能包含英文、数字、短横线和下划线
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">学生名单（可选）</label>
          <div className="space-y-2">
            {!csvFile ? (
              <div className="relative">
                <input
                  id="csv-file-input"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                >
                  <Upload size={20} className="text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">点击上传 CSV 文件</span>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText size={20} className="text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{csvFile.name}</p>
                    <p className="text-xs text-gray-500">{(csvFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="text-red-600 hover:text-red-800 transition-colors"
                  title="移除文件"
                >
                  <XCircle size={20} />
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500">
              上传 CSV 文件将自动创建学生账号并加入班级。CSV 文件需包含学号和姓名字段。
            </p>
            <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertTriangle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-900">
                  批量创建提示
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  批量创建的学生账号，其登录用户名和初始密码均为学号。请提醒学生首次登录后及时修改密码。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
          >
            取消
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? '创建中...' : '创建'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
