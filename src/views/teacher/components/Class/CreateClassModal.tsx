import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, XCircle, AlertTriangle, Download } from 'lucide-react';
import Modal from '@/views/teacher/components/shadcn/TeacherModal';
import Button from '@/views/teacher/components/shadcn/TeacherButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateClassName, validateClassCode } from '@/views/teacher/utils/validation';
import { useToast } from '@/views/teacher/hooks/useToast';

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

  useEffect(() => {
    if (isOpen) {
      setFormData({ class_name: '', class_code: '' });
      setCsvFile(null);
      setIsSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

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

  const handleDownloadTemplate = () => {
    const headers = ['学号', '姓名'];
    const examples = [
      ['20240001', '张三'],
      ['20240002', '李四']
    ];

    const csvContent = [
      headers.join(','),
      ...examples.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '学生名单导入模板.csv';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <Label className="text-foreground mb-2">
            班级名称 <span className="text-destructive">*</span>
          </Label>
          <Input
            type="text"
            value={formData.class_name}
            onChange={(e) => setFormData(prev => ({ ...prev, class_name: e.target.value }))}
            className="rounded-lg"
            placeholder="例如：2024级计算机1班"
            maxLength={50}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            2-50个字符，可包含中文、英文、数字、短横线和下划线
          </p>
        </div>
        <div>
          <Label className="text-foreground mb-2">
            班级代码 <span className="text-destructive">*</span>
          </Label>
          <Input
            type="text"
            value={formData.class_code}
            onChange={(e) => setFormData(prev => ({ ...prev, class_code: e.target.value }))}
            className="rounded-lg"
            placeholder="例如：CS101-2025"
            maxLength={20}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            2-20个字符，只能包含英文、数字、短横线和下划线
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-foreground">学生名单（可选）</Label>
            <Button
              type="button"
              onClick={handleDownloadTemplate}
              className="h-auto p-0 text-xs text-primary hover:underline"
            >
              <Download size={12} className="mr-1" />
              下载模板
            </Button>
          </div>
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
                <Label
                  htmlFor="csv-file-input"
                  className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-primary/30 hover:bg-primary/10 transition-all duration-200"
                >
                  <Upload size={20} className="text-muted-foreground mr-2" />
                  <span className="text-sm text-muted-foreground">点击上传 CSV 文件</span>
                </Label>
              </div>
            ) : (
              <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText size={20} className="text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{csvFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(csvFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <Button
                  onClick={handleRemoveFile}
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  title="移除文件"
                >
                  <XCircle size={20} />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              上传 CSV 文件将自动创建学生账号并加入班级。CSV 文件需包含学号和姓名字段。
            </p>
            <div className="flex items-start space-x-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <AlertTriangle size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-primary">
                  批量创建提示
                </p>
                <p className="text-xs text-primary mt-1">
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
