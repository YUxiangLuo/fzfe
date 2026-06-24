import React, { useState, useEffect } from "react";
import {
    Table,
    Button,
    Modal,
    Input,
    message,
    Card,
    Typography,
    Tabs,
    Descriptions,
    Tag
} from "antd";
import {
    EyeOutlined,
    TeamOutlined,
    UserOutlined
} from "@ant-design/icons";
import type { Class, Student, User } from "../types";
import { apiClient } from "../../../utils/apiClient";

const { Title } = Typography;
const { Search } = Input;

export const formatNullableClassText = (value: string | null | undefined): string => {
    const text = value?.trim();
    return text && text.length > 0 ? text : '-';
};

const includesSearchTerm = (value: string | null | undefined, normalizedSearchTerm: string): boolean =>
    (value ?? '').toLowerCase().includes(normalizedSearchTerm);

export const matchesClassSearch = (classInfo: Pick<Class, 'class_name' | 'class_code'>, searchTerm: string): boolean => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    if (!normalizedSearchTerm) return true;

    return includesSearchTerm(classInfo.class_name, normalizedSearchTerm) ||
        includesSearchTerm(classInfo.class_code, normalizedSearchTerm);
};

const ClassManagement: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);

    const fetchClasses = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.get("/classes");
            setClasses(data || []);
            setFilteredClasses(data || []);
        } catch (err: any) {
            message.error(err.message || "获取班级数据失败");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        setFilteredClasses(classes.filter((classInfo) => matchesClassSearch(classInfo, searchTerm)));
    }, [searchTerm, classes]);

    const handleViewDetails = async (classInfo: Class) => {
        try {
            const details = await apiClient.get(`/classes/${classInfo.class_id}`);
            setSelectedClass(details);
            setDetailsModalOpen(true);
        } catch (err: any) {
            message.error(err.message || "获取班级详情失败");
        }
    };

    const columns = [
        {
            title: '班级编号',
            dataIndex: 'class_code',
            key: 'class_code',
            render: (text: string | null) => formatNullableClassText(text),
        },
        {
            title: '班级名称',
            dataIndex: 'class_name',
            key: 'class_name',
        },
        {
            title: '所属教师',
            dataIndex: 'teacher_name',
            key: 'teacher_name',
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: Class) => (
                <Button
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={() => handleViewDetails(record)}
                >
                    查看班级详情
                </Button>
            ),
        },
    ];

    const studentColumns = [
        { title: '学号', dataIndex: 'username', key: 'username' },
        { title: '姓名', dataIndex: 'full_name', key: 'full_name' },
        { title: '邮箱', dataIndex: 'email', key: 'email' },
    ];

    const assistantColumns = [
        { title: '用户名', dataIndex: 'username', key: 'username' },
        { title: '姓名', dataIndex: 'full_name', key: 'full_name' },
        { title: '角色', key: 'role', render: () => <Tag color="cyan">助教</Tag> },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <Title level={3} style={{ marginBottom: 0 }}>班级管理</Title>
                </div>
            </div>

            <Card>
                <div style={{ marginBottom: 16, display: 'flex' }}>
                    <Search
                        placeholder="请输入班级名称或编号"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: 300 }}
                        allowClear
                    />
                </div>
                <Table
                    dataSource={filteredClasses}
                    columns={columns}
                    rowKey="class_id"
                    loading={isLoading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={`班级详情 - ${selectedClass?.class_name || ''}`}
                open={detailsModalOpen}
                onCancel={() => setDetailsModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailsModalOpen(false)}>
                        关闭
                    </Button>
                ]}
                width={800}
            >
                {selectedClass && (
                    <div>
                        <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
                            <Descriptions.Item label="班级名称">{selectedClass.class_name}</Descriptions.Item>
                            <Descriptions.Item label="班级编号">{formatNullableClassText(selectedClass.class_code)}</Descriptions.Item>
                            <Descriptions.Item label="所属教师">{selectedClass.teacher_name}</Descriptions.Item>
                            <Descriptions.Item label="学生人数">{selectedClass.students?.length || 0}</Descriptions.Item>
                        </Descriptions>

                        <Tabs defaultActiveKey="students" items={[
                            {
                                key: 'students',
                                label: (<span><UserOutlined />学生列表</span>),
                                children: (
                                    <Table
                                        dataSource={selectedClass.students || []}
                                        columns={studentColumns}
                                        rowKey="user_id"
                                        pagination={{ pageSize: 5 }}
                                        size="small"
                                    />
                                )
                            },
                            {
                                key: 'assistants',
                                label: (<span><TeamOutlined />助教列表</span>),
                                children: (
                                    <Table
                                        dataSource={selectedClass.assistants || []}
                                        columns={assistantColumns}
                                        rowKey="user_id"
                                        pagination={{ pageSize: 5 }}
                                        size="small"
                                        locale={{ emptyText: '暂无助教' }}
                                    />
                                )
                            }
                        ]} />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ClassManagement;
