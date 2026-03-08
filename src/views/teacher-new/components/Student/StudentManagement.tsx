import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Select,
    message,
    Spin,
    Alert,
    Typography,
    Avatar,
    Tooltip
} from 'antd';
import {
    PlusOutlined,
    UserAddOutlined,
    DeleteOutlined,
    SearchOutlined,
    KeyOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import type { Student, Class } from '../../types';
import { isAbortError, getErrorMessage } from '../../utils/error';

const { Title, Text } = Typography;
const { confirm } = Modal;

const StudentManagement: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [teacherId, setTeacherId] = useState<number | null>(null);

    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
    const [selectModalOpen, setSelectModalOpen] = useState(false);
    const [studentToResetPassword, setStudentToResetPassword] = useState<Student | null>(null);
    const [allUnassignedStudents, setAllUnassignedStudents] = useState<Student[]>([]);
    const [enrollingStudentId, setEnrollingStudentId] = useState<number | null>(null);
    const [enrolledStudentIds, setEnrolledStudentIds] = useState<Set<number>>(new Set());
    const [searchInModal, setSearchInModal] = useState('');

    const [addForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Get teacher ID from token
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded = decodeToken(token);
            if (decoded) {
                setTeacherId(decoded.sub);
            }
        }
    }, []);

    // Fetch classes
    useEffect(() => {
        if (!teacherId) return;

        const controller = new AbortController();

        const fetchClasses = async () => {
            setIsLoadingClasses(true);
            try {
                const data = await apiClient.get(`/teachers/${teacherId}/classes`, { signal: controller.signal });
                if (controller.signal.aborted) return;
                const classList = data || [];
                setClasses(classList);
                if (classList.length > 0) {
                    setSelectedClassId(classList[0].class_id);
                }
            } catch (err: unknown) {
                if (isAbortError(err)) return;
                if (!controller.signal.aborted) {
                    setError(getErrorMessage(err, '获取班级列表失败'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingClasses(false);
                }
            }
        };

        fetchClasses();
        return () => { controller.abort(); };
    }, [teacherId]);

    // Fetch students when class changes
    const loadStudents = useCallback(async (classId: number) => {
        setIsLoadingStudents(true);
        setError(null);
        try {
            const data = await apiClient.get(`/classes/${classId}/students`);
            const list = data || [];
            const sorted = [...list].sort((a: Student, b: Student) => {
                const numA = Number(a.username);
                const numB = Number(b.username);
                if (Number.isNaN(numA) || Number.isNaN(numB)) {
                    return a.username.localeCompare(b.username);
                }
                return numA - numB;
            });
            setStudents(sorted);
        } catch (err: unknown) {
            setError(getErrorMessage(err, '获取学生列表失败'));
            setStudents([]);
        } finally {
            setIsLoadingStudents(false);
        }
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            loadStudents(selectedClassId);
        }
    }, [selectedClassId, loadStudents]);

    // Debounced search filter
    const filteredStudents = useMemo(() => {
        if (!searchTerm.trim()) return students;
        const query = searchTerm.toLowerCase().trim();
        return students.filter(s =>
            s.username.toLowerCase().includes(query) ||
            s.full_name.toLowerCase().includes(query)
        );
    }, [students, searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedClassId, searchTerm]);

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
        if (currentPage > maxPage) {
            setCurrentPage(maxPage);
        }
    }, [filteredStudents.length, currentPage]);

    // Current class name
    const currentClassName = useMemo(() => {
        return classes.find(c => c.class_id === selectedClassId)?.class_name || '—';
    }, [classes, selectedClassId]);

    // Add student handler
    const handleAddStudent = async (values: { username: string; full_name: string; password: string; email?: string; phone_number?: string }) => {
        if (!selectedClassId) return;

        setIsSaving(true);
        try {
            const payload: { username: string; full_name: string; password: string; email?: string; phone_number?: string } = {
                username: values.username.trim(),
                full_name: values.full_name.trim(),
                password: values.password,
            };

            if (values.email?.trim()) {
                payload.email = values.email.trim();
            }
            if (values.phone_number?.trim()) {
                payload.phone_number = values.phone_number.trim();
            }

            const createdStudent = await apiClient.post<Student>(`/classes/${selectedClassId}/students`, payload);
            setStudents(prev => [...prev, createdStudent]);
            setAddModalOpen(false);
            addForm.resetFields();
            message.success('学生添加成功');
        } catch (err: unknown) {
            const msg = getErrorMessage(err, '添加失败');
            if (msg.includes('409') || msg.includes('已存在')) {
                message.error('学号或邮箱已存在');
            } else {
                message.error(msg);
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Remove student handler
    const handleRemoveStudent = (student: Student) => {
        if (!selectedClassId) return;

        confirm({
            title: '确认移除学生',
            icon: <ExclamationCircleOutlined />,
            content: (
                <span>
                    确定要将学生 <Text strong>{student.full_name}</Text> ({student.username})
                    从班级 <Text strong>{currentClassName}</Text> 中移除吗？
                </span>
            ),
            okText: '移除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await apiClient.delete(`/classes/${selectedClassId}/students/${student.user_id}`);
                    setStudents(prev => prev.filter(s => s.user_id !== student.user_id));
                    message.success('学生已移除');
                } catch (err: unknown) {
                    message.error(getErrorMessage(err, '移除失败'));
                }
            },
        });
    };

    // Reset password handler
    const handleResetPassword = async (values: { newPassword: string }) => {
        if (!studentToResetPassword) return;

        setIsSaving(true);
        try {
            const response = await apiClient.post<{ message?: string }>(`/users/${studentToResetPassword.user_id}/reset-password`, {
                newPassword: values.newPassword,
            });
            setResetPasswordModalOpen(false);
            setStudentToResetPassword(null);
            passwordForm.resetFields();
            message.success(response?.message || '密码重置成功');
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '重置失败'));
        } finally {
            setIsSaving(false);
        }
    };

    // Fetch unassigned students for selection
    const fetchUnassignedStudents = useCallback(async () => {
        if (!selectedClassId) return;

        try {
            // Get all students not in this class
            const data = await apiClient.get('/students/unenrolled');
            setAllUnassignedStudents(data || []);
            setEnrolledStudentIds(new Set());
            setSearchInModal('');
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '获取可选学生列表失败'));
        }
    }, [selectedClassId]);

    // Enroll single student (matching teacher's API)
    const handleEnrollStudent = async (student: Student) => {
        if (!selectedClassId) return;

        setEnrollingStudentId(student.user_id);
        try {
            await apiClient.post(`/classes/${selectedClassId}/enroll`, {
                student_id: student.user_id,
            });
            setEnrolledStudentIds(prev => new Set(prev).add(student.user_id));
            message.success(`学生 ${student.full_name} 添加成功`);
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '添加失败'));
        } finally {
            setEnrollingStudentId(null);
        }
    };

    // Close select modal and refresh if any students were enrolled
    const handleCloseSelectModal = () => {
        setSelectModalOpen(false);
        if (enrolledStudentIds.size > 0 && selectedClassId) {
            loadStudents(selectedClassId);
        }
    };

    // Filter students in modal by search term
    const filteredUnassignedStudents = useMemo(() => {
        if (!searchInModal.trim()) return allUnassignedStudents;
        const query = searchInModal.toLowerCase();
        return allUnassignedStudents.filter(s =>
            s.username.toLowerCase().includes(query) ||
            s.full_name.toLowerCase().includes(query)
        );
    }, [allUnassignedStudents, searchInModal]);

    // Open reset password modal
    const openResetPasswordModal = (student: Student) => {
        setStudentToResetPassword(student);
        passwordForm.resetFields();
        setResetPasswordModalOpen(true);
    };

    // Color palette for avatars
    const colorPalette = ['#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1'];
    const getAvatarColor = (index: number) => colorPalette[index % colorPalette.length];

    // Table columns
    const columns = [
        {
            title: '序号',
            key: 'index',
            width: 70,
            render: (_: unknown, __: unknown, index: number) => (currentPage - 1) * pageSize + index + 1,
        },
        {
            title: '学号',
            dataIndex: 'username',
            key: 'username',
            width: 120,
        },
        {
            title: '学生姓名',
            key: 'name',
            render: (_: unknown, record: Student, index: number) => (
                <Space>
                    <Avatar style={{ backgroundColor: getAvatarColor(index) }}>
                        {record.full_name.charAt(0)}
                    </Avatar>
                    <span>{record.full_name}</span>
                </Space>
            ),
        },
        {
            title: '邮箱',
            dataIndex: 'email',
            key: 'email',
            render: (text: string | null) => text || '—',
        },
        {
            title: '手机号码',
            dataIndex: 'phone_number',
            key: 'phone_number',
            render: (text: string | null) => text || '—',
        },
        {
            title: '操作',
            key: 'action',
            width: 200,
            render: (_: unknown, record: Student) => (
                <Space>
                    <Tooltip title="重置密码">
                        <Button
                            type="primary"
                            size="small"
                            icon={<KeyOutlined />}
                            onClick={() => openResetPasswordModal(record)}
                        >
                            设置密码
                        </Button>
                    </Tooltip>
                    <Tooltip title="从班级移除">
                        <Button
                            type="primary"
                            danger
                            size="small"
                            ghost
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveStudent(record)}
                        >
                            移除
                        </Button>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    if (isLoadingClasses) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Spin size="large">
                    <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>
                </Spin>
            </div>
        );
    }

    if (error && !students.length) {
        return <Alert message="加载失败" description={error} type="error" showIcon />;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>学生管理</Title>
                    {selectedClassId && (
                        <Text type="secondary">当前班级：{currentClassName}</Text>
                    )}
                </div>
                <Space>
                    <Button
                        icon={<UserAddOutlined />}
                        onClick={() => {
                            if (!selectedClassId) {
                                message.warning('请先选择班级');
                                return;
                            }
                            fetchUnassignedStudents();
                            setSelectModalOpen(true);
                        }}
                    >
                        从学生库添加
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            if (!selectedClassId) {
                                message.warning('请先选择班级');
                                return;
                            }
                            setAddModalOpen(true);
                        }}
                    >
                        添加学生
                    </Button>
                </Space>
            </div>

            {/* Filter Card */}
            <Card style={{ marginBottom: 16 }}>
                <Space size="large" wrap>
                    <div>
                        <Text strong style={{ marginRight: 8 }}>选择班级</Text>
                        <Select
                            value={selectedClassId}
                            onChange={setSelectedClassId}
                            style={{ width: 200 }}
                            placeholder="请选择班级"
                            loading={isLoadingClasses}
                            options={classes.map(c => ({ value: c.class_id, label: c.class_name }))}
                        />
                    </div>
                    <div>
                        <Text strong style={{ marginRight: 8 }}>搜索学生</Text>
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="学号或姓名"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: 200 }}
                            allowClear
                        />
                    </div>
                </Space>
            </Card>

            {/* Students Table */}
            <Card title="学生列表">
                <Table
                    dataSource={filteredStudents}
                    columns={columns}
                    rowKey="user_id"
                    loading={isLoadingStudents}
                    pagination={{ current: currentPage, pageSize, onChange: (page) => setCurrentPage(page), showTotal: (total) => `共 ${total} 名学生` }}
                    locale={{ emptyText: selectedClassId ? '暂无学生' : '请先选择班级' }}
                />
            </Card>

            {/* Add Student Modal */}
            <Modal
                title="添加学生"
                open={addModalOpen}
                onCancel={() => {
                    setAddModalOpen(false);
                    addForm.resetFields();
                }}
                onOk={() => addForm.submit()}
                confirmLoading={isSaving}
                okText="添加"
                cancelText="取消"
            >
                <Form form={addForm} layout="vertical" onFinish={handleAddStudent}>
                    <Form.Item
                        label="学号"
                        name="username"
                        rules={[
                            { required: true, message: '请输入学号' },
                            { pattern: /^\d{8,}$/, message: '学号至少8位数字' },
                        ]}
                    >
                        <Input placeholder="例如：20210001" />
                    </Form.Item>
                    <Form.Item
                        label="姓名"
                        name="full_name"
                        rules={[
                            { required: true, message: '请输入姓名', whitespace: true },
                            { min: 2, message: '姓名至少2个字符' },
                        ]}
                    >
                        <Input placeholder="例如：张三" />
                    </Form.Item>
                    <Form.Item
                        label="初始密码"
                        name="password"
                        rules={[
                            { required: true, message: '请输入密码' },
                            { min: 6, message: '密码至少6个字符' },
                        ]}
                    >
                        <Input.Password placeholder="至少6个字符" />
                    </Form.Item>
                    <Form.Item
                        label="邮箱（可选）"
                        name="email"
                        rules={[{ type: 'email', message: '请输入正确的邮箱格式' }]}
                    >
                        <Input placeholder="example@email.com" />
                    </Form.Item>
                    <Form.Item
                        label="手机号（可选）"
                        name="phone_number"
                        rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' }]}
                    >
                        <Input placeholder="13800138000" />
                    </Form.Item>
                    <Alert
                        message="提示"
                        description={`学生将被添加到班级：${currentClassName}`}
                        type="info"
                        showIcon
                    />
                </Form>
            </Modal>

            {/* Reset Password Modal */}
            <Modal
                title={`重置密码 - ${studentToResetPassword?.full_name || ''}`}
                open={resetPasswordModalOpen}
                onCancel={() => {
                    setResetPasswordModalOpen(false);
                    setStudentToResetPassword(null);
                    passwordForm.resetFields();
                }}
                onOk={() => passwordForm.submit()}
                confirmLoading={isSaving}
                okText="确认重置"
                cancelText="取消"
            >
                <Form form={passwordForm} layout="vertical" onFinish={handleResetPassword}>
                    <Form.Item
                        label="新密码"
                        name="newPassword"
                        rules={[
                            { required: true, message: '请输入新密码' },
                            { min: 6, message: '密码至少6个字符' },
                        ]}
                    >
                        <Input.Password placeholder="至少6个字符" />
                    </Form.Item>
                    <Form.Item
                        label="确认密码"
                        name="confirmPassword"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: '请确认密码' },
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
                        <Input.Password placeholder="再次输入新密码" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Select Student Modal */}
            <Modal
                title="从学生库中添加"
                open={selectModalOpen}
                onCancel={handleCloseSelectModal}
                footer={[
                    <Button key="close" onClick={handleCloseSelectModal}>
                        关闭
                    </Button>
                ]}
                width={500}
            >
                <div style={{ marginBottom: 16 }}>
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="按学号或姓名搜索"
                        value={searchInModal}
                        onChange={e => setSearchInModal(e.target.value)}
                        allowClear
                    />
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {filteredUnassignedStudents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                            暂无可加入的学生
                        </div>
                    ) : (
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {filteredUnassignedStudents.map((student, index) => {
                                const isEnrolling = enrollingStudentId === student.user_id;
                                const isEnrolled = enrolledStudentIds.has(student.user_id);
                                return (
                                    <Card
                                        key={student.user_id}
                                        size="small"
                                        style={{
                                            borderColor: isEnrolled ? '#52c41a' : undefined,
                                            background: isEnrolled ? '#f6ffed' : undefined,
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Space>
                                                <Avatar style={{ backgroundColor: getAvatarColor(index) }}>
                                                    {student.full_name.charAt(0)}
                                                </Avatar>
                                                <div>
                                                    <Text strong>{student.full_name}</Text>
                                                    <div style={{ fontSize: 12, color: '#666' }}>学号：{student.username}</div>
                                                </div>
                                            </Space>
                                            <Button
                                                type="primary"
                                                size="small"
                                                onClick={() => handleEnrollStudent(student)}
                                                loading={isEnrolling}
                                                disabled={isEnrolled}
                                                style={isEnrolled ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : undefined}
                                            >
                                                {isEnrolled ? '已添加' : '添加到班级'}
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </Space>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default StudentManagement;
