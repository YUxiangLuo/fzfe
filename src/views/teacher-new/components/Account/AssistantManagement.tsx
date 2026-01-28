import React, { useState, useEffect, useCallback } from 'react';
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
    Tooltip
} from 'antd';
import {
    PlusOutlined,
    UserAddOutlined,
    SwapOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import type { User, Class } from '../../types';

const { Title } = Typography;

interface Assistant extends User { }

const AssistantManagement: React.FC = () => {
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [managedClasses, setManagedClasses] = useState<Class[]>([]);
    const [allAssistants, setAllAssistants] = useState<Assistant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [selectModalOpen, setSelectModalOpen] = useState(false);
    const [reassignModalOpen, setReassignModalOpen] = useState(false);
    const [assistantToReassign, setAssistantToReassign] = useState<Assistant | null>(null);
    const [classAssignments, setClassAssignments] = useState<Record<number, number[]>>({});

    const [createForm] = Form.useForm();
    const [selectForm] = Form.useForm();
    const [reassignForm] = Form.useForm();

    const [isSaving, setIsSaving] = useState(false);

    // Fetch initial data
    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Authentication token not found.');
                const decoded = decodeToken(token);
                if (!decoded) throw new Error('Invalid token.');

                const teacherId = decoded.sub;

                const [assistantsData, classesData] = await Promise.all([
                    apiClient.get(`/teachers/${teacherId}/assistants`, { signal: controller.signal }),
                    apiClient.get(`/teachers/${teacherId}/classes`, { signal: controller.signal })
                ]);

                if (!controller.signal.aborted) {
                    setAssistants(assistantsData || []);
                    setManagedClasses(classesData || []);
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                if (!controller.signal.aborted) {
                    setError(err.message || 'Failed to fetch data.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            controller.abort();
        };
    }, []);

    // Fetch all assistants when select modal opens
    const fetchAllAssistants = useCallback(async () => {
        try {
            const data = await apiClient.get('/assistants');
            setAllAssistants(data || []);
        } catch (err: any) {
            message.error('获取助教列表失败');
        }
    }, []);

    // Fetch class assignments for an assistant
    const fetchClassAssignments = useCallback(async (assistantId: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const decoded = decodeToken(token);
            if (!decoded) return;

            const teacherId = decoded.sub;
            const data = await apiClient.get(`/teachers/${teacherId}/assistants/${assistantId}/classes`);
            setClassAssignments(prev => ({ ...prev, [assistantId]: data?.map((c: Class) => c.class_id) || [] }));
            return data?.map((c: Class) => c.class_id) || [];
        } catch (err: any) {
            console.error('Failed to fetch class assignments:', err);
            return [];
        }
    }, []);

    // Create assistant handler
    const handleCreateAssistant = async (values: any) => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Authentication token not found.');
            const decoded = decodeToken(token);
            if (!decoded) throw new Error('Invalid token.');

            const newAssistant = await apiClient.post('/assistants', {
                username: values.username,
                full_name: values.full_name,
                email: values.email,
                phone_number: values.phone_number || null,
                password: values.password,
            });

            // Assign to selected classes
            if (values.class_ids?.length > 0) {
                for (const classId of values.class_ids) {
                    await apiClient.post(`/classes/${classId}/assistants`, {
                        assistant_id: newAssistant.user_id,
                    });
                }
            }

            setAssistants(prev => [newAssistant, ...prev]);
            setCreateModalOpen(false);
            createForm.resetFields();
            message.success('助教创建成功');
        } catch (err: any) {
            message.error(err.message || '创建失败');
        } finally {
            setIsSaving(false);
        }
    };

    // Select existing assistant handler
    const handleSelectAssistant = async (values: any) => {
        setIsSaving(true);
        try {
            const selectedAssistant = allAssistants.find(a => a.user_id === values.assistant_id);
            if (!selectedAssistant) throw new Error('未找到助教');

            // Assign to selected classes
            if (values.class_ids?.length > 0) {
                for (const classId of values.class_ids) {
                    await apiClient.post(`/classes/${classId}/assistants`, {
                        assistant_id: values.assistant_id,
                    });
                }
            }

            if (!assistants.some(a => a.user_id === selectedAssistant.user_id)) {
                setAssistants(prev => [selectedAssistant, ...prev]);
            }

            setSelectModalOpen(false);
            selectForm.resetFields();
            message.success('助教分配成功');
        } catch (err: any) {
            message.error(err.message || '分配失败');
        } finally {
            setIsSaving(false);
        }
    };

    // Reassign assistant handler
    const handleReassignAssistant = async (values: any) => {
        if (!assistantToReassign) return;

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Authentication token not found.');
            const decoded = decodeToken(token);
            if (!decoded) throw new Error('Invalid token.');

            const teacherId = decoded.sub;
            const currentClasses = classAssignments[assistantToReassign.user_id] || [];
            const newClasses = values.class_ids || [];

            // Remove from classes no longer selected
            for (const classId of currentClasses) {
                if (!newClasses.includes(classId)) {
                    await apiClient.delete(`/classes/${classId}/assistants/${assistantToReassign.user_id}`);
                }
            }

            // Add to newly selected classes
            for (const classId of newClasses) {
                if (!currentClasses.includes(classId)) {
                    await apiClient.post(`/classes/${classId}/assistants`, {
                        assistant_id: assistantToReassign.user_id,
                    });
                }
            }

            // If no classes assigned, remove from list
            if (newClasses.length === 0) {
                setAssistants(prev => prev.filter(a => a.user_id !== assistantToReassign.user_id));
                message.info('助教已从所有班级解绑');
            } else {
                message.success('班级分配已更新');
            }

            setReassignModalOpen(false);
            setAssistantToReassign(null);
            reassignForm.resetFields();
        } catch (err: any) {
            message.error(err.message || '更新失败');
        } finally {
            setIsSaving(false);
        }
    };

    // Open reassign modal
    const openReassignModal = async (assistant: Assistant) => {
        setAssistantToReassign(assistant);
        const assignedClasses = await fetchClassAssignments(assistant.user_id);
        reassignForm.setFieldsValue({ class_ids: assignedClasses });
        setReassignModalOpen(true);
    };

    // Table columns
    const columns = [
        {
            title: '姓名',
            dataIndex: 'full_name',
            key: 'full_name',
        },
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: '手机号',
            dataIndex: 'phone_number',
            key: 'phone_number',
            render: (text: string | null) => text || '-',
        },
        {
            title: '邮箱',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: Assistant) => (
                <Button
                    type="primary"
                    ghost
                    icon={<SwapOutlined />}
                    onClick={() => openReassignModal(record)}
                >
                    重新分配
                </Button>
            ),
        },
    ];

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Spin size="large">
                    <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>
                </Spin>
            </div>
        );
    }

    if (error) {
        return <Alert title="加载失败" description={error} type="error" showIcon />;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={3} style={{ marginBottom: 0 }}>助教管理</Title>
                <Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                        创建助教
                    </Button>
                    <Button
                        icon={<UserAddOutlined />}
                        onClick={() => {
                            fetchAllAssistants();
                            setSelectModalOpen(true);
                        }}
                    >
                        从库中选择
                    </Button>
                </Space>
            </div>

            <Card>
                <Table
                    dataSource={assistants}
                    columns={columns}
                    rowKey="user_id"
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: '暂无助教' }}
                />
            </Card>

            {/* Create Assistant Modal */}
            <Modal
                title="创建助教"
                open={createModalOpen}
                onCancel={() => {
                    setCreateModalOpen(false);
                    createForm.resetFields();
                }}
                onOk={() => createForm.submit()}
                confirmLoading={isSaving}
                okText="创建"
                cancelText="取消"
            >
                <Form form={createForm} layout="vertical" onFinish={handleCreateAssistant}>
                    <Form.Item
                        label="用户名"
                        name="username"
                        rules={[
                            { required: true, message: '请输入用户名', whitespace: true },
                            { min: 3, message: '用户名至少3个字符' },
                        ]}
                    >
                        <Input placeholder="请输入用户名" />
                    </Form.Item>
                    <Form.Item
                        label="姓名"
                        name="full_name"
                        rules={[
                            { required: true, message: '请输入姓名', whitespace: true },
                            { min: 2, message: '姓名至少2个字符' },
                        ]}
                    >
                        <Input placeholder="请输入姓名" />
                    </Form.Item>
                    <Form.Item
                        label="邮箱"
                        name="email"
                        rules={[
                            { required: true, message: '请输入邮箱' },
                            { type: 'email', message: '请输入正确的邮箱格式' },
                        ]}
                    >
                        <Input placeholder="example@email.com" />
                    </Form.Item>
                    <Form.Item
                        label="手机号（可选）"
                        name="phone_number"
                        rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' }]}
                    >
                        <Input placeholder="请输入手机号" />
                    </Form.Item>
                    <Form.Item
                        label="密码"
                        name="password"
                        rules={[
                            { required: true, message: '请输入密码' },
                            { min: 6, message: '密码至少6个字符' },
                        ]}
                    >
                        <Input.Password placeholder="至少6个字符" />
                    </Form.Item>
                    <Form.Item label="分配到班级（可选）" name="class_ids">
                        <Select
                            mode="multiple"
                            placeholder="选择要分配的班级"
                            options={managedClasses.map(c => ({ value: c.class_id, label: c.class_name }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Select Existing Assistant Modal */}
            <Modal
                title="从库中选择助教"
                open={selectModalOpen}
                onCancel={() => {
                    setSelectModalOpen(false);
                    selectForm.resetFields();
                }}
                onOk={() => selectForm.submit()}
                confirmLoading={isSaving}
                okText="分配"
                cancelText="取消"
            >
                <Form form={selectForm} layout="vertical" onFinish={handleSelectAssistant}>
                    <Form.Item
                        label="选择助教"
                        name="assistant_id"
                        rules={[{ required: true, message: '请选择助教' }]}
                    >
                        <Select
                            placeholder="选择一个助教"
                            showSearch
                            optionFilterProp="label"
                            options={allAssistants
                                .filter(a => !assistants.some(existing => existing.user_id === a.user_id))
                                .map(a => ({ value: a.user_id, label: `${a.full_name} (${a.username})` }))}
                        />
                    </Form.Item>
                    <Form.Item
                        label="分配到班级"
                        name="class_ids"
                        rules={[{ required: true, message: '请选择至少一个班级' }]}
                    >
                        <Select
                            mode="multiple"
                            placeholder="选择要分配的班级"
                            options={managedClasses.map(c => ({ value: c.class_id, label: c.class_name }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Reassign Assistant Modal */}
            <Modal
                title={`重新分配 - ${assistantToReassign?.full_name || ''}`}
                open={reassignModalOpen}
                onCancel={() => {
                    setReassignModalOpen(false);
                    setAssistantToReassign(null);
                    reassignForm.resetFields();
                }}
                onOk={() => reassignForm.submit()}
                confirmLoading={isSaving}
                okText="保存"
                cancelText="取消"
            >
                <Form form={reassignForm} layout="vertical" onFinish={handleReassignAssistant}>
                    <Form.Item label="分配到班级" name="class_ids">
                        <Select
                            mode="multiple"
                            placeholder="选择要分配的班级（留空则解绑）"
                            options={managedClasses.map(c => ({ value: c.class_id, label: c.class_name }))}
                        />
                    </Form.Item>
                    <Alert
                        message="提示"
                        description="如果不选择任何班级，该助教将从您的助教列表中移除。"
                        type="info"
                        showIcon
                        style={{ marginTop: 8 }}
                    />
                </Form>
            </Modal>
        </div>
    );
};

export default AssistantManagement;
