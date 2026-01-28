import React, { useState, useEffect } from "react";
import {
    Table,
    Button,
    Switch,
    Space,
    Modal,
    Form,
    Input,
    Upload,
    message,
    Card,
    Typography
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    DownloadOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import type { UploadFile } from 'antd/es/upload/interface';
import type { ExperimentManual } from "../types";
import { apiClient } from "../../../utils/apiClient";
import { DOWNLOAD_SERVER_BASE_URL } from "../../../config/appConfig";

const { TextArea } = Input;
const { Title, Text } = Typography;

const MAX_MANUAL_NAME_LENGTH = 100;
const MANUAL_NAME_MIN_LENGTH = 2;
const MAX_MANUAL_NOTES_LENGTH = 200;
const MAX_MANUAL_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ExperimentManualView: React.FC = () => {
    const [manuals, setManuals] = useState<ExperimentManual[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal states
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingManual, setEditingManual] = useState<ExperimentManual | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const [fileList, setFileList] = useState<UploadFile[]>([]);

    const fetchManuals = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.get("/manuals");
            setManuals(data || []);
        } catch (err: any) {
            message.error(err.message || "获取实验手册失败");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchManuals();
    }, []);

    const handleStatusToggle = async (manual: ExperimentManual, checked: boolean) => {
        try {
            const updatedManual = await apiClient.put(
                `/manuals/${manual.manual_id}`,
                { is_active: checked ? 1 : 0 }
            );

            setManuals((prevManuals) => {
                if (updatedManual.is_active === 1) {
                    return prevManuals.map((m) =>
                        m.manual_id === updatedManual.manual_id
                            ? updatedManual
                            : { ...m, is_active: 0 },
                    );
                } else {
                    return prevManuals.map((m) =>
                        m.manual_id === updatedManual.manual_id ? updatedManual : m,
                    );
                }
            });
            message.success('状态更新成功');
        } catch (err: any) {
            message.error(`状态更新失败: ${err.message}`);
        }
    };

    const handleDelete = async (manualId: number) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除此实验手册吗？此操作不可恢复。',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await apiClient.delete(`/manuals/${manualId}`);
                    setManuals(prev => prev.filter((m) => m.manual_id !== manualId));
                    message.success('删除成功');
                } catch (err: any) {
                    message.error(`删除失败: ${err.message}`);
                }
            },
        });
    };

    const handleDownload = (filePath: string) => {
        const filename = filePath.split("/").pop();
        const fullUrl = `${DOWNLOAD_SERVER_BASE_URL}/manuals/${filename}`;

        const link = document.createElement('a');
        link.href = fullUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpload = async (values: any) => {
        if (fileList.length === 0) {
            message.error('请上传PDF文件');
            return;
        }

        const file = (fileList[0]?.originFileObj || fileList[0]) as any;
        if (!file) {
            message.error('无法获取文件对象');
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("file_name", values.name.trim());
        formData.append("description", values.notes ? values.notes.trim() : "");

        try {
            const newManualFromServer = await apiClient.postFormData(
                "/manuals",
                formData,
            );
            setManuals((prev) => [newManualFromServer, ...prev]);
            setIsUploadModalOpen(false);
            form.resetFields();
            setFileList([]);
            message.success('上传成功');
        } catch (err: any) {
            message.error(`上传失败: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (values: any) => {
        if (!editingManual) return;

        setIsSubmitting(true);
        try {
            const updatedManual = await apiClient.put(
                `/manuals/${editingManual.manual_id}`,
                {
                    file_name: values.name.trim(),
                    description: values.notes ? values.notes.trim() : "",
                },
            );
            setManuals(prev =>
                prev.map((m) =>
                    m.manual_id === updatedManual.manual_id ? updatedManual : m,
                ),
            );
            setIsEditModalOpen(false);
            setEditingManual(null);
            message.success('保存成功');
        } catch (err: any) {
            message.error(`保存失败: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (manual: ExperimentManual) => {
        setEditingManual(manual);
        editForm.setFieldsValue({
            name: manual.file_name,
            notes: manual.description
        });
        setIsEditModalOpen(true);
    }

    const columns = [
        {
            title: '手册名称',
            dataIndex: 'file_name',
            key: 'file_name',
        },
        {
            title: '备注',
            dataIndex: 'description',
            key: 'description',
            render: (text: string | null) => text || '-',
        },
        {
            title: '上传者',
            dataIndex: 'uploader_name',
            key: 'uploader_name',
        },
        {
            title: '上传时间',
            dataIndex: 'uploaded_at',
            key: 'uploaded_at',
            render: (text: string) => new Date(text).toLocaleString(),
        },
        {
            title: '状态',
            key: 'is_active',
            render: (_: any, record: ExperimentManual) => (
                <Switch
                    checked={record.is_active === 1}
                    onChange={(checked) => handleStatusToggle(record, checked)}
                    checkedChildren="启用"
                    unCheckedChildren="禁用"
                />
            ),
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: ExperimentManual) => (
                <Space size="middle">
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                        type="link"
                        aria-label={`编辑 ${record.file_name}`}
                        title={`编辑 ${record.file_name}`}
                    />
                    <Button
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownload(record.file_path)}
                        type="link"
                        aria-label={`下载 ${record.file_name}`}
                        title={`下载 ${record.file_name}`}
                    />
                    <Button
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => handleDelete(record.manual_id)}
                        type="link"
                        aria-label={`删除 ${record.file_name}`}
                        title={`删除 ${record.file_name}`}
                    />
                </Space>
            ),
        },
    ];

    const uploadProps = {
        onRemove: () => {
            setFileList([]);
        },
        beforeUpload: (file: any) => {
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            if (!isPdf) {
                message.error('仅支持上传PDF格式文件');
                return Upload.LIST_IGNORE;
            }
            const isLt20M = file.size / 1024 / 1024 < 20;
            if (!isLt20M) {
                message.error('文件大小不能超过20MB');
                return Upload.LIST_IGNORE;
            }
            setFileList([file]);
            return false; // Prevent automatic upload
        },
        fileList,
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <Title level={3} style={{ marginBottom: 0 }}>实验手册管理</Title>
                    <Text type="secondary">管理学生端显示的实验手册，支持上传、更新和启用/禁用操作</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsUploadModalOpen(true)}>
                    新增
                </Button>
            </div>

            <Card>
                <Table
                    dataSource={manuals}
                    columns={columns}
                    rowKey="manual_id"
                    loading={isLoading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title="新增实验手册"
                open={isUploadModalOpen}
                onCancel={() => { setIsUploadModalOpen(false); form.resetFields(); setFileList([]); }}
                onOk={() => form.submit()}
                confirmLoading={isSubmitting}
            >
                <Form form={form} layout="vertical" onFinish={handleUpload}>
                    <Form.Item
                        name="name"
                        label="手册名称"
                        rules={[
                            { required: true, message: '手册名称不能为空', whitespace: true },
                            { min: MANUAL_NAME_MIN_LENGTH, message: `手册名称至少需要${MANUAL_NAME_MIN_LENGTH}个字符` },
                            { max: MAX_MANUAL_NAME_LENGTH, message: `手册名称不能超过${MAX_MANUAL_NAME_LENGTH}个字符` }
                        ]}
                    >
                        <Input placeholder="例如：生产决策仿真实验手册" />
                    </Form.Item>
                    <Form.Item
                        name="notes"
                        label="备注"
                        rules={[{ max: MAX_MANUAL_NOTES_LENGTH, message: `备注不能超过${MAX_MANUAL_NOTES_LENGTH}个字符` }]}
                    >
                        <TextArea rows={3} placeholder="例如：适用于2025春季学期" />
                    </Form.Item>
                    <Form.Item label="上传PDF文件" required>
                        <Upload {...uploadProps} maxCount={1}>
                            <Button icon={<UploadOutlined />}>选择文件</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="修改实验手册"
                open={isEditModalOpen}
                onCancel={() => { setIsEditModalOpen(false); setEditingManual(null); editForm.resetFields(); }}
                onOk={() => editForm.submit()}
                confirmLoading={isSubmitting}
            >
                <Form form={editForm} layout="vertical" onFinish={handleEdit}>
                    <Form.Item
                        name="name"
                        label="手册名称"
                        rules={[
                            { required: true, message: '手册名称不能为空', whitespace: true },
                            { min: MANUAL_NAME_MIN_LENGTH, message: `手册名称至少需要${MANUAL_NAME_MIN_LENGTH}个字符` },
                            { max: MAX_MANUAL_NAME_LENGTH, message: `手册名称不能超过${MAX_MANUAL_NAME_LENGTH}个字符` }
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="notes"
                        label="备注"
                        rules={[{ max: MAX_MANUAL_NOTES_LENGTH, message: `备注不能超过${MAX_MANUAL_NOTES_LENGTH}个字符` }]}
                    >
                        <TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ExperimentManualView;
