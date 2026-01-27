import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import type { Class, Student } from "../types";
import type { User as AdminUser } from "../types";
import { apiClient } from "../../../utils/apiClient";
import {
  User as UserIcon,
  Loader,
  AlertTriangle,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classInfo: Class | null;
}

export const ClassDetailsModal: React.FC<ClassDetailsModalProps> = ({
  isOpen,
  onClose,
  classInfo,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [assistants, setAssistants] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && classInfo) {
      const fetchClassDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = (await apiClient.get(
            `/classes/${classInfo.class_id}`,
          )) as Class;
          setStudents(response.students || []);
          setAssistants(response.assistants || []);
        } catch (err: any) {
          setError(err.message || "获取班级详情失败");
        } finally {
          setIsLoading(false);
        }
      };

      fetchClassDetails();
    }
  }, [isOpen, classInfo]);

  const renderStudentList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader className="animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <p className="mt-2">加载失败: {error}</p>
        </div>
      );
    }

    if (students.length === 0) {
    return <p className="text-center text-muted-foreground py-4">该班级暂无学生。</p>;
    }

    return (
      <ul className="divide-y divide-gray-200">
        {students.map((student) => (
          <li
            key={student.user_id}
            className="flex items-center p-3 hover:bg-muted/50"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mr-4">
              <UserIcon size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{student.full_name}</p>
              <p className="text-sm text-muted-foreground">{student.username}</p>
            </div>
            <p className="text-sm text-muted-foreground">{student.email}</p>
          </li>
        ))}
      </ul>
    );
  };

  const renderAssistantList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader className="animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <p className="mt-2">加载失败: {error}</p>
        </div>
      );
    }

    if (assistants.length === 0) {
    return <p className="text-center text-muted-foreground py-4">该班级暂无助教。</p>;
    }

    return (
      <ul className="divide-y divide-gray-200">
        {assistants.map((assistant) => (
          <li
            key={assistant.user_id}
            className="flex items-center p-3 hover:bg-muted/50"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mr-4">
              <UserPlus size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{assistant.full_name}</p>
              <p className="text-sm text-muted-foreground">{assistant.username}</p>
            </div>
            <p className="text-sm text-muted-foreground">{assistant.email}</p>
          </li>
        ))}
      </ul>
    );
  };

  if (!isOpen || !classInfo) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="班级详情"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-muted p-4">
          <h3 className="text-lg font-bold text-foreground">
            {classInfo.class_name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            班级编号:{" "}
            <span className="font-medium">{classInfo.class_code}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            任课教师:{" "}
            <span className="font-medium">{classInfo.teacher_name}</span>
          </p>
        </div>

        <div>
          <h4 className="text-md font-semibold text-foreground mb-3">学生列表</h4>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {renderStudentList()}
          </div>
        </div>

        <div>
          <h4 className="text-md font-semibold text-foreground mb-3">助教列表</h4>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {renderAssistantList()}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
};
