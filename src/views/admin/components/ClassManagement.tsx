import React, { useState, useEffect } from "react";
import { Search, Eye, Loader, AlertTriangle } from "lucide-react";
import type { Class } from "../types";
import { apiClient } from "../../../utils/apiClient";
import { ClassDetailsModal } from "./ClassDetailsModal"; // 引入新的弹窗组件
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新增状态来管理弹窗
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get("/classes");
        setClasses(data || []);
        setFilteredClasses(data || []);
      } catch (err: any) {
        setError(err.message || "获取班级数据失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    let filtered = classes;
    if (searchTerm) {
      filtered = classes.filter(
        (c) =>
          c.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.class_code.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    setFilteredClasses(filtered);
  }, [searchTerm, classes]);

  // 打开弹窗的处理函数
  const handleViewDetails = (classInfo: Class) => {
    setSelectedClass(classInfo);
    setIsDetailsModalOpen(true);
  };

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="py-12 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader className="h-5 w-5 animate-spin" />
              <span>正在加载班级数据...</span>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="py-12 text-center">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <span>加载失败: {error}</span>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (filteredClasses.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
            未找到符合条件的班级。
          </TableCell>
        </TableRow>
      );
    }

    return filteredClasses.map((classInfo) => (
      <TableRow key={classInfo.class_id}>
        <TableCell className="font-medium">{classInfo.class_code}</TableCell>
        <TableCell>{classInfo.class_name}</TableCell>
        <TableCell className="text-muted-foreground">
          {classInfo.teacher_name}
        </TableCell>
        <TableCell>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(classInfo)}
          >
            <Eye className="mr-2 h-4 w-4" />
            查看班级详情
          </Button>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <>
      <div className="space-y-6">
        {/* 筛选器 */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="class-search-input" className="mb-3">班级名称/编号搜索</Label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="class-search-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="请输入班级名称或编号"
                  className="pl-11"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 班级列表 */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>班级编号</TableHead>
                <TableHead>班级名称</TableHead>
                <TableHead>所属教师</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderTableContent()}</TableBody>
          </Table>
        </div>
      </div>

      {/* 渲染弹窗组件 */}
      <ClassDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        classInfo={selectedClass}
      />
    </>
  );
};

export default ClassManagement;
