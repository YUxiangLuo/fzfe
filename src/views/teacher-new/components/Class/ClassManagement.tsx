import React, { useState, useEffect, useCallback } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Upload,
    message,
    Spin,
    Alert,
    Typography,
    Result,
    List,
    Tag
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    TeamOutlined,
    UploadOutlined,
    DownloadOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import type { Class, Student } from '../../types';
import { formatDate } from '../../utils/format';
import { getErrorMessage } from '../../utils/error';
import { getTeacherPortalUserOrThrow, isAssistantTeacherPortalUser, listManagedClasses } from '../../utils/portalApi';

const { Title, Text } = Typography;
const { confirm } = Modal;

interface CreateClassResponse {
    class: Class;
    students_created: number;
    students_enrolled: number;
    students: Student[];
    errors: string[];
}

const ClassManagement: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAssistantView, setIsAssistantView] = useState(false);

    // Modal states
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [studentsModalOpen, setStudentsModalOpen] = useState(false);
    const [resultModalOpen, setResultModalOpen] = useState(false);

    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [isStudentsLoading, setIsStudentsLoading] = useState(false);
    const [createResult, setCreateResult] = useState<CreateClassResponse | null>(null);

    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const canManageClasses = !isAssistantView;

    // Download CSV template
    const handleDownloadTemplate = () => {
        const headers = ['学号', '姓名'];
        const examples = [
            ['20240001', '张三'],
            ['20240002', '李四']
        ];

        const csvContent = `\ufeff${[
            headers.join(','),
            ...examples.map(row => row.join(','))
        ].join('\r\n')}\r\n`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        try {
            const link = document.createElement('a');
            link.href = url;
            link.download = '学生名单导入模板.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } finally {
            URL.revokeObjectURL(url);
        }
    };

    // Fetch classes
    const fetchClasses = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const currentUser = getTeacherPortalUserOrThrow();
            setIsAssistantView(isAssistantTeacherPortalUser(currentUser));

            const data = await listManagedClasses();
            setClasses(data || []);
        } catch (err: unknown) {
            setError(getErrorMessage(err, '获取班级列表失败'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    // Create class handler
    const handleCreateClass = async (values: { class_name: string; class_code: string; students_file?: UploadFile[] }) => {
        if (!canManageClasses) {
            message.warning('助教仅可查看班级信息，不能新增班级');
            return;
        }

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('class_name', values.class_name);
            formData.append('class_code', values.class_code);
            const selectedFiles: UploadFile[] = values.students_file || fileList;
            if (selectedFiles && selectedFiles.length > 0) {
                const file = selectedFiles[0];
                if (file && file.originFileObj) {
                    formData.append('student_list', file.originFileObj);
                }
            }

            const result = await apiClient.postFormData<CreateClassResponse>('/classes', formData);

            setClasses(prev => [result.class, ...prev]);
            setCreateResult(result);
            setCreateModalOpen(false);
            setResultModalOpen(true);
            createForm.resetFields();
            setFileList([]);
            message.success('班级创建成功');
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '创建失败'));
        } finally {
            setIsSaving(false);
        }
    };

    // Edit class handler
    const handleEditClass = async (values: { class_name: string; class_code: string }) => {
        if (!canManageClasses) {
            message.warning('助教仅可查看班级信息，不能编辑班级');
            return;
        }
        if (!selectedClass) return;

        setIsSaving(true);
        try {
            const updatedClass = await apiClient.put<Class>(`/classes/${selectedClass.class_id}`, {
                class_name: values.class_name,
                class_code: values.class_code,
            });

            setClasses(prev => prev.map(c =>
                c.class_id === selectedClass.class_id
                    ? { ...c, ...updatedClass }
                    : c
            ));

            setEditModalOpen(false);
            setSelectedClass(null);
            editForm.resetFields();
            message.success('班级信息更新成功');
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '更新失败'));
        } finally {
            setIsSaving(false);
        }
    };

    // Delete class handler
    const handleDeleteClass = (classItem: Class) => {
        if (!canManageClasses) {
            message.warning('助教仅可查看班级信息，不能删除班级');
            return;
        }

        confirm({
            title: `确定要删除班级"${classItem.class_name}"吗？`,
            icon: <ExclamationCircleOutlined />,
            content: '此操作不可撤销，删除班级将同时移除该班级下的所有关联数据。',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await apiClient.delete(`/classes/${classItem.class_id}`);
                    setClasses(prev => prev.filter(c => c.class_id !== classItem.class_id));
                    message.success('班级删除成功');
                } catch (err: unknown) {
                    message.error(getErrorMessage(err, '删除失败'));
                }
            },
        });
    };

    // View students handler
    const handleViewStudents = async (classItem: Class) => {
        setSelectedClass(classItem);
        setStudentsModalOpen(true);
        setStudents([]);
        setIsStudentsLoading(true);

        try {
            const response = await apiClient.get(`/classes/${classItem.class_id}`);
            setStudents(response.students || []);
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '获取学生列表失败'));
        } finally {
            setIsStudentsLoading(false);
        }
    };

    // Open edit modal
    const openEditModal = (classItem: Class) => {
        if (!canManageClasses) {
            message.warning('助教仅可查看班级信息，不能编辑班级');
            return;
        }

        setSelectedClass(classItem);
        editForm.setFieldsValue({
            class_name: classItem.class_name,
            class_code: classItem.class_code,
        });
        setEditModalOpen(true);
    };

    // Upload props
    const uploadProps: UploadProps = {
        maxCount: 1,
        beforeUpload: (file) => {
            const isCsv = file.name.toLowerCase().endsWith('.csv');

            if (!isCsv) {
                message.error('只支持 CSV 文件 (.csv)');
                return Upload.LIST_IGNORE;
            }
            return false; // Don't auto upload
        },
        accept: '.csv,text/csv',
        fileList,
        onChange: ({ fileList: nextFileList }) => {
            setFileList(nextFileList);
            createForm.setFieldValue('students_file', nextFileList);
        },
        onRemove: () => {
            setFileList([]);
            createForm.setFieldValue('students_file', []);
        },
    };

    // Table columns
    const columns = [
        {
            title: '班级名称',
            dataIndex: 'class_name',
            key: 'class_name',
        },
        {
            title: '班级编号',
            dataIndex: 'class_code',
            key: 'class_code',
            render: (text: string | null) => text || '未设置',
        },
        {
            title: '助教',
            key: 'assistants',
            render: (_: unknown, record: Class) => {
                const assistantNames = (record.assistants || []).map(a => a.full_name).join('、');
                return assistantNames || '—';
            },
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (value: string) => (
                <Tag color="blue">{formatDate(value)}</Tag>
            ),
        },
        {
            title: '操作',
            key: 'action',
            render: (_: unknown, record: Class) => (
                <Space>
                    <Button
                        type="link"
                        icon={<TeamOutlined />}
                        onClick={() => handleViewStudents(record)}
                    >
                        学生列表
                    </Button>
                    {canManageClasses && (
                        <>
                            <Button
                                type="link"
                                icon={<EditOutlined />}
                                onClick={() => openEditModal(record)}
                            >
                                编辑
                            </Button>
                            <Button
                                type="link"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteClass(record)}
                            >
                                删除
                            </Button>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    // Student table columns
    const studentColumns = [
        {
            title: '学号',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: '姓名',
            dataIndex: 'full_name',
            key: 'full_name',
        },
        {
            title: '邮箱',
            dataIndex: 'email',
            key: 'email',
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
        return <Alert message="加载失败" description={error} type="error" showIcon />;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={3} style={{ marginBottom: 0 }}>班级管理</Title>
                {canManageClasses && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                        新增班级
                    </Button>
                )}
            </div>

            <Card>
                <Table
                    dataSource={classes}
                    columns={columns}
                    rowKey="class_id"
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: '暂无班级' }}
                />
            </Card>

            {/* Create Class Modal */}
            <Modal
                title="新增班级"
                open={createModalOpen}
                onCancel={() => {
                    setCreateModalOpen(false);
                    createForm.resetFields();
                    setFileList([]);
                }}
                onOk={() => createForm.submit()}
                confirmLoading={isSaving}
                okText="创建"
                cancelText="取消"
                width={600}
            >
                <Form form={createForm} layout="vertical" onFinish={handleCreateClass}>
                    <Form.Item
                        label="班级名称"
                        name="class_name"
                        rules={[
                            { required: true, message: '请输入班级名称', whitespace: true },
                            { min: 2, message: '班级名称至少2个字符' },
                        ]}
                    >
                        <Input placeholder="请输入班级名称" />
                    </Form.Item>
                    <Form.Item
                        label="班级编号"
                        name="class_code"
                        rules={[
                            { required: true, message: '请输入班级编号', whitespace: true },
                        ]}
                    >
                        <Input placeholder="请输入班级编号" />
                    </Form.Item>
                    <Form.Item
                        name="students_file"
                        valuePropName="fileList"
                        getValueFromEvent={(event) => event?.fileList || []}
                        label="学生名单（可选）" 
                        extra="上传 CSV 文件批量导入学生，CSV 文件需包含学号和姓名字段。"
                    >
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button 
                                icon={<DownloadOutlined />} 
                                onClick={handleDownloadTemplate}
                                type="link"
                                style={{ padding: 0 }}
                            >
                                下载模板
                            </Button>
                            <Upload {...uploadProps}>
                                <Button icon={<UploadOutlined />}>选择文件</Button>
                            </Upload>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Class Modal */}
            <Modal
                title="编辑班级"
                open={editModalOpen}
                onCancel={() => {
                    setEditModalOpen(false);
                    setSelectedClass(null);
                    editForm.resetFields();
                }}
                onOk={() => editForm.submit()}
                confirmLoading={isSaving}
                okText="保存"
                cancelText="取消"
            >
                <Form form={editForm} layout="vertical" onFinish={handleEditClass}>
                    <Form.Item
                        label="班级名称"
                        name="class_name"
                        rules={[
                            { required: true, message: '请输入班级名称', whitespace: true },
                            { min: 2, message: '班级名称至少2个字符' },
                        ]}
                    >
                        <Input placeholder="请输入班级名称" />
                    </Form.Item>
                    <Form.Item
                        label="班级编号"
                        name="class_code"
                        rules={[
                            { required: true, message: '请输入班级编号', whitespace: true },
                        ]}
                    >
                        <Input placeholder="请输入班级编号" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* View Students Modal */}
            <Modal
                title={`学生列表 - ${selectedClass?.class_name || ''}`}
                open={studentsModalOpen}
                onCancel={() => {
                    setStudentsModalOpen(false);
                    setSelectedClass(null);
                    setStudents([]);
                }}
                footer={[
                    <Button key="close" onClick={() => setStudentsModalOpen(false)}>
                        关闭
                    </Button>
                ]}
                width={700}
            >
                {isStudentsLoading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <Spin />
                    </div>
                ) : (
                    <Table
                        dataSource={students}
                        columns={studentColumns}
                        rowKey="user_id"
                        pagination={{ pageSize: 5 }}
                        size="small"
                        locale={{ emptyText: '暂无学生' }}
                    />
                )}
            </Modal>

            {/* Create Result Modal */}
            <Modal
                title="创建结果"
                open={resultModalOpen}
                onCancel={() => {
                    setResultModalOpen(false);
                    setCreateResult(null);
                }}
                footer={[
                    <Button key="close" type="primary" onClick={() => {
                        setResultModalOpen(false);
                        setCreateResult(null);
                    }}>
                        确定
                    </Button>
                ]}
                width={600}
            >
                {createResult && (
                    <Result
                        status="success"
                        title="班级创建成功"
                        subTitle={`班级 "${createResult.class.class_name}" 已成功创建`}
                    >
                        <div style={{ textAlign: 'left' }}>
                            <p><Text strong>新建学生数：</Text>{createResult.students_created}</p>
                            <p><Text strong>注册学生数：</Text>{createResult.students_enrolled}</p>
                            {createResult.errors?.length > 0 && (
                                <>
                                    <Text type="warning" strong>导入错误：</Text>
                                    <List
                                        size="small"
                                        dataSource={createResult.errors}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <Text type="danger">{item}</Text>
                                            </List.Item>
                                        )}
                                    />
                                </>
                            )}
                        </div>
                    </Result>
                )}
            </Modal>
        </div>
    );
};

export default ClassManagement;
