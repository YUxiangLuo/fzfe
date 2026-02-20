import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Table,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Upload,
    message,
    Card,
    Typography,
    Tag,
    Tooltip
} from "antd";
import {
    UserOutlined,
    EditOutlined,
    DeleteOutlined,
    UploadOutlined,
    PlusOutlined,
    KeyOutlined,
    SearchOutlined
} from "@ant-design/icons";
import type { UploadFile } from 'antd/es/upload/interface';
import type { User } from "../types";
import { apiClient } from "../../../utils/apiClient";
import { decodeToken } from "../../../utils/auth";
import { validatePassword } from "../utils/validation";

const { Title, Text } = Typography;
const { Search } = Input;

const roleColors: Record<string, string> = {
    admin: "red",
    teacher: "blue",
    assistant: "cyan",
    student: "green",
};

const roleLabels: Record<string, string> = {
    student: "学生",
    teacher: "教师",
    assistant: "助教",
    admin: "管理员",
};

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const fetchRequestIdRef = useRef(0);

    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [passwordForm] = Form.useForm();

    const [addTeacherModalOpen, setAddTeacherModalOpen] = useState(false);
    const [teacherForm] = Form.useForm();

    const [addAssistantModalOpen, setAddAssistantModalOpen] = useState(false);
    const [assistantForm] = Form.useForm();

    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [batchType, setBatchType] = useState<'teacher' | 'assistant'>('teacher');
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [batchLoading, setBatchLoading] = useState(false);

    const fetchUsers = useCallback(async (page: number, pageSize: number, query: string) => {
        const requestId = ++fetchRequestIdRef.current;
        setIsLoading(true);
        try {
            const endpoint = query
                ? `/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${pageSize}`
                : `/users?page=${page}&limit=${pageSize}`;
            const response = await apiClient.get(endpoint);
            if (requestId !== fetchRequestIdRef.current) return;

            const fetchedUsers = Array.isArray(response?.data) ? response.data : [];
            const serverPagination = response?.pagination;

            setUsers(fetchedUsers);
            setPagination((prev) => ({
                ...prev,
                current: serverPagination?.currentPage ?? page,
                pageSize: serverPagination?.pageSize ?? pageSize,
                total: serverPagination?.totalItems ?? fetchedUsers.length,
            }));
        } catch (err: any) {
            if (requestId !== fetchRequestIdRef.current) return;
            message.error(err.message || "获取用户数据失败");
        } finally {
            if (requestId === fetchRequestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        try {
            const token = localStorage.getItem("token");
            if (token) {
                const decoded = decodeToken(token);
                if (decoded) setCurrentAdminId(decoded.sub);
            }
        } catch (err) {
            console.error('Failed to read token from localStorage:', err);
        }
    }, []);

    useEffect(() => {
        fetchUsers(pagination.current, pagination.pageSize, searchTerm);
    }, [fetchUsers, pagination.current, pagination.pageSize, searchTerm]);

    const handleTableChange = (newPagination: any) => {
        setPagination(newPagination);
    };

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        setPagination({ ...pagination, current: 1 });
    };

    const handleDelete = (user: User) => {
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除用户 "${user.full_name}" 吗？此操作不可恢复。`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await apiClient.delete(`/users/${user.user_id}`);
                    message.success('用户删除成功');
                    const shouldBackPage = users.length === 1 && pagination.current > 1;
                    const targetPage = shouldBackPage ? pagination.current - 1 : pagination.current;
                    fetchUsers(targetPage, pagination.pageSize, searchTerm);
                } catch (err: any) {
                    message.error(`删除失败: ${err.message}`);
                }
            },
        });
    };

    const handlePasswordReset = async (values: any) => {
        if (!selectedUser) return;
        try {
            await apiClient.put(`/users/${selectedUser.user_id}/password`, {
                newPassword: values.newPassword.trim(),
            });
            message.success(`已成功为用户 ${selectedUser.full_name} 重置密码`);
            setPasswordModalOpen(false);
            passwordForm.resetFields();
            setSelectedUser(null);
        } catch (err: any) {
            message.error(`密码重置失败: ${err.message}`);
        }
    };

    const handleCreateTeacher = async (values: any) => {
        try {
            await apiClient.post("/users/teachers", values);
            message.success('教师添加成功');
            setAddTeacherModalOpen(false);
            teacherForm.resetFields();
            fetchUsers(pagination.current, pagination.pageSize, searchTerm);
        } catch (err: any) {
            message.error(`添加教师失败: ${err.message}`);
        }
    };

    const handleCreateAssistant = async (values: any) => {
        try {
            await apiClient.post("/users/assistants", values);
            message.success('助教添加成功');
            setAddAssistantModalOpen(false);
            assistantForm.resetFields();
            fetchUsers(pagination.current, pagination.pageSize, searchTerm);
        } catch (err: any) {
            message.error(`添加助教失败: ${err.message}`);
        }
    };

    const handleBatchUpload = async () => {
        if (fileList.length === 0) {
            message.error('请上传CSV文件');
            return;
        }
        const file = fileList[0]?.originFileObj;
        if (!file) return;

        setBatchLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        const endpoint = batchType === 'teacher' ? "/users/teachers/batch" : "/users/assistants/batch";

        try {
            await apiClient.postFormData(endpoint, formData);
            message.success(`批量添加${batchType === 'teacher' ? '教师' : '助教'}成功`);
            setBatchModalOpen(false);
            setFileList([]);
            fetchUsers(pagination.current, pagination.pageSize, searchTerm);
        } catch (err: any) {
            message.error(`批量添加失败: ${err.message}`);
        } finally {
            setBatchLoading(false);
        }
    };

    const validatePasswordRule = (_: unknown, value: string) => {
        if (!value) {
            return Promise.resolve();
        }

        const result = validatePassword(value, { minLength: 6 });
        if (result.valid) {
            return Promise.resolve();
        }

        return Promise.reject(new Error(result.error || '密码格式不正确'));
    };

    const columns = [
        {
            title: '账号',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: '姓名',
            dataIndex: 'full_name',
            key: 'full_name',
        },
        {
            title: '角色',
            dataIndex: 'role',
            key: 'role',
            render: (role: string) => {
                const roleKey = role.toLowerCase();
                return (
                    <Tag color={roleColors[roleKey]}>{roleLabels[roleKey]}</Tag>
                );
            }
        },
        {
            title: '邮箱',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: '注册时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text: string) => text ? new Date(text).toLocaleString() : '-',
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: User) => {
                const isCurrentUser = record.user_id === currentAdminId;
                return (
                    <Space size="small">
                        <Tooltip title={isCurrentUser ? "不能在此处修改自己的密码" : "修改密码"}>
                            <Button
                                icon={<KeyOutlined />}
                                size="small"
                                disabled={isCurrentUser}
                                onClick={() => { setSelectedUser(record); setPasswordModalOpen(true); }}
                            />
                        </Tooltip>
                        <Tooltip title={isCurrentUser ? "不能删除自己的账户" : "删除用户"}>
                            <Button
                                icon={<DeleteOutlined />}
                                danger
                                size="small"
                                disabled={isCurrentUser}
                                onClick={() => handleDelete(record)}
                            />
                        </Tooltip>
                    </Space>
                )
            }
        }
    ];

    const uploadProps = {
        onRemove: () => setFileList([]),
        beforeUpload: (file: any) => {
            if (!file.name.toLowerCase().endsWith('.csv')) {
                message.error('仅支持上传CSV格式文件');
                return Upload.LIST_IGNORE;
            }
            setFileList([file]);
            return false;
        },
        fileList
    };

    const UserFormFields = (
        <>
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input />
            </Form.Item>
            <Form.Item name="full_name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input />
            </Form.Item>
            <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
                <Input />
            </Form.Item>
            <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]}>
                <Input />
            </Form.Item>
            <Form.Item
                name="password"
                label="密码"
                rules={[
                    { required: true, message: '请输入密码' },
                    { validator: validatePasswordRule },
                ]}
            >
                <Input.Password />
            </Form.Item>
        </>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <Title level={3} style={{ marginBottom: 0 }}>用户列表</Title>
                    <Text type="secondary">查看系统用户，并支持新增、重置密码与删除操作</Text>
                </div>
                <Space wrap>
                    <Button onClick={() => setAddTeacherModalOpen(true)} icon={<EditOutlined />}>添加教师</Button>
                    <Button onClick={() => { setBatchType('teacher'); setBatchModalOpen(true); }} icon={<UploadOutlined />}>批量添加教师</Button>
                    <Button onClick={() => setAddAssistantModalOpen(true)} icon={<EditOutlined />}>添加助教</Button>
                    <Button onClick={() => { setBatchType('assistant'); setBatchModalOpen(true); }} icon={<UploadOutlined />}>批量添加助教</Button>
                </Space>
            </div>

            <Card>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Search
                        placeholder="输入关键字搜索"
                        onSearch={handleSearch}
                        style={{ width: 300 }}
                        allowClear
                    />
                </div>
                <Table
                    dataSource={users}
                    columns={columns}
                    rowKey="user_id"
                    loading={isLoading}
                    pagination={pagination}
                    onChange={handleTableChange}
                />
            </Card>

            {/* Change Password Modal */}
            <Modal
                title={`修改用户 "${selectedUser?.full_name}" 的密码`}
                open={passwordModalOpen}
                onCancel={() => { setPasswordModalOpen(false); setSelectedUser(null); passwordForm.resetFields(); }}
                onOk={() => passwordForm.submit()}
            >
                <Form form={passwordForm} layout="vertical" onFinish={handlePasswordReset}>
                    <Form.Item
                        name="newPassword"
                        label="新密码"
                        rules={[
                            { required: true, message: '请输入新密码' },
                            { validator: validatePasswordRule }
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Form.Item
                        name="confirmPassword"
                        label="确认密码"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: '请确认新密码' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('两次输入的密码不一致'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Add Teacher Modal */}
            <Modal
                title="添加教师"
                open={addTeacherModalOpen}
                onCancel={() => { setAddTeacherModalOpen(false); teacherForm.resetFields(); }}
                onOk={() => teacherForm.submit()}
            >
                <Form form={teacherForm} layout="vertical" onFinish={handleCreateTeacher}>
                    {UserFormFields}
                </Form>
            </Modal>

            {/* Add Assistant Modal */}
            <Modal
                title="添加助教"
                open={addAssistantModalOpen}
                onCancel={() => { setAddAssistantModalOpen(false); assistantForm.resetFields(); }}
                onOk={() => assistantForm.submit()}
            >
                <Form form={assistantForm} layout="vertical" onFinish={handleCreateAssistant}>
                    {UserFormFields}
                </Form>
            </Modal>

            {/* Batch Upload Modal */}
            <Modal
                title={`批量添加${batchType === 'teacher' ? '教师' : '助教'}`}
                open={batchModalOpen}
                onCancel={() => { setBatchModalOpen(false); setFileList([]); }}
                onOk={handleBatchUpload}
                confirmLoading={batchLoading}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">请上传包含用户信息的CSV文件，仅支持.csv格式</Text>
                </div>
                <Upload {...uploadProps} maxCount={1} accept=".csv">
                    <Button icon={<UploadOutlined />}>选择CSV文件</Button>
                </Upload>
            </Modal>
        </div>
    );
};

export default UserManagement;
