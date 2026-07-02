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
import type { User, Class } from '../../types';
import { isAbortError, getErrorMessage } from '../../utils/error';
import { getSessionUserOrThrow } from '../../../../utils/session';
import { useTermManagedClasses } from '../../utils/useTermManagedClasses';
import AcademicTermSelect from '../AcademicTermSelect';

const { Title } = Typography;

interface Assistant extends User { }

const AssistantManagement: React.FC = () => {
    const {
        terms,
        selectedTermId,
        setSelectedTermId,
        classes: managedClasses,
        isLoading: isLoadingClasses,
        isLoadingTerms,
        error: classLoadError,
    } = useTermManagedClasses();
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [allAssistants, setAllAssistants] = useState<Assistant[]>([]);
    const [isLoadingAssistants, setIsLoadingAssistants] = useState(false);
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

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            if (!selectedTermId) {
                setAssistants([]);
                return;
            }
            setIsLoadingAssistants(true);
            setError(null);
            try {
                const teacherId = getSessionUserOrThrow().sub;

                const assistantsData = await apiClient.get(`/teachers/${teacherId}/assistants?term_id=${selectedTermId}`, { signal: controller.signal });

                if (!controller.signal.aborted) {
                    setAssistants(assistantsData || []);
                }
            } catch (err: unknown) {
                if (isAbortError(err)) return;
                if (!controller.signal.aborted) {
                    setError(getErrorMessage(err, '获取数据失败'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingAssistants(false);
                }
            }
        };

        fetchData();

        return () => {
            controller.abort();
        };
    }, [selectedTermId]);

    useEffect(() => {
        setClassAssignments({});
    }, [selectedTermId]);

    // Fetch all assistants when select modal opens
    const fetchAllAssistants = useCallback(async () => {
        try {
            const data = await apiClient.get('/assistants');
            setAllAssistants(data || []);
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '获取助教列表失败'));
        }
    }, []);

    // Fetch class assignments for an assistant
    const fetchClassAssignments = useCallback(async (assistantId: number) => {
        if (!selectedTermId) return [];
        try {
            const teacherId = getSessionUserOrThrow().sub;
            const data = await apiClient.get(`/teachers/${teacherId}/assistants/${assistantId}/classes?term_id=${selectedTermId}`);
            setClassAssignments(prev => ({ ...prev, [assistantId]: data?.map((c: Class) => c.class_id) || [] }));
            return data?.map((c: Class) => c.class_id) || [];
        } catch (err: unknown) {
            console.error('Failed to fetch class assignments:', err);
            return [];
        }
    }, [selectedTermId]);

    // Create assistant handler
    const handleCreateAssistant = async (values: { username: string; full_name: string; email: string; phone_number?: string; password: string; class_ids: number[] }) => {
        setIsSaving(true);
        try {
            const newAssistant = await apiClient.post('/assistants', {
                username: values.username,
                full_name: values.full_name,
                email: values.email,
                phone_number: values.phone_number || undefined,
                password: values.password,
                class_ids: values.class_ids,
            });

            setAssistants(prev => [newAssistant, ...prev]);
            setCreateModalOpen(false);
            createForm.resetFields();
            message.success('助教创建成功');
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '创建失败'));
        } finally {
            setIsSaving(false);
        }
    };

    // Select existing assistant handler
    const handleSelectAssistant = async (values: { assistant_id: number; class_ids: number[] }) => {
        setIsSaving(true);
        try {
            const selectedAssistant = allAssistants.find(a => a.user_id === values.assistant_id);
            if (!selectedAssistant) throw new Error('未找到助教');

            // Assign to selected classes
            if (values.class_ids?.length > 0) {
                const results = await Promise.allSettled(
                    values.class_ids.map((classId: number) =>
                        apiClient.post(`/classes/${classId}/assistants`, {
                            assistant_id: values.assistant_id,
                        })
                    )
                );
                const failed = results.filter(r => r.status === 'rejected');
                if (failed.length > 0) {
                    message.warning(`${failed.length} 个班级分配失败`);
                }
            }

            if (!assistants.some(a => a.user_id === selectedAssistant.user_id)) {
                setAssistants(prev => [selectedAssistant, ...prev]);
            }

            setSelectModalOpen(false);
            selectForm.resetFields();
            message.success('助教分配成功');
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '分配失败'));
        } finally {
            setIsSaving(false);
        }
    };

    // Reassign assistant handler
    const handleReassignAssistant = async (values: { class_ids?: number[] }) => {
        if (!assistantToReassign) return;

        setIsSaving(true);
        try {
            const teacherId = getSessionUserOrThrow().sub;
            const currentClasses = classAssignments[assistantToReassign.user_id] || [];
            const newClasses = values.class_ids || [];

            // Remove from classes no longer selected
            const removeResults = await Promise.allSettled(
                currentClasses
                    .filter((classId: number) => !newClasses.includes(classId))
                    .map((classId: number) =>
                        apiClient.delete(`/classes/${classId}/assistants/${assistantToReassign.user_id}`)
                    )
            );

            // Add to newly selected classes
            const addResults = await Promise.allSettled(
                newClasses
                    .filter((classId: number) => !currentClasses.includes(classId))
                    .map((classId: number) =>
                        apiClient.post(`/classes/${classId}/assistants`, {
                            assistant_id: assistantToReassign.user_id,
                        })
                    )
            );

            const totalFailed = [...removeResults, ...addResults].filter(r => r.status === 'rejected').length;

            // If no classes assigned, remove from list
            setClassAssignments(prev => ({ ...prev, [assistantToReassign.user_id]: newClasses }));

            if (newClasses.length === 0) {
                setAssistants(prev => prev.filter(a => a.user_id !== assistantToReassign.user_id));
                message.info('助教已从所有班级解绑');
            } else if (totalFailed > 0) {
                message.warning(`班级分配已更新，但 ${totalFailed} 个操作失败`);
            } else {
                message.success('班级分配已更新');
            }

            setReassignModalOpen(false);
            setAssistantToReassign(null);
            reassignForm.resetFields();
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '更新失败'));
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
            render: (_: unknown, record: Assistant) => (
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

    const isLoading = isLoadingClasses || isLoadingAssistants;
    const displayError = classLoadError || error;

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Spin size="large">
                    <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>
                </Spin>
            </div>
        );
    }

    if (displayError) {
        return <Alert message="加载失败" description={displayError} type="error" showIcon />;
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
                <div style={{ marginBottom: 16 }}>
                    <AcademicTermSelect
                        terms={terms}
                        value={selectedTermId}
                        onChange={setSelectedTermId}
                        loading={isLoadingTerms}
                    />
                </div>
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
