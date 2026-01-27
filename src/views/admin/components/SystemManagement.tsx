import React, { useState } from "react";
import { Users, GraduationCap } from "lucide-react";
import UserManagement from "./UserManagement";
import ClassManagement from "./ClassManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SystemManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'classes'>('users');

  const tabs = [
    {
      id: 'users' as const,
      label: '用户管理',
      icon: Users,
      component: UserManagement
    },
    {
      id: 'classes' as const,
      label: '班级管理',
      icon: GraduationCap,
      component: ClassManagement
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">系统管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理系统用户账户和班级信息，提供密码重置等管理功能
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="rounded-2xl border border-border bg-card p-1 shadow-sm">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2 px-6">
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <tab.component />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default SystemManagement;
