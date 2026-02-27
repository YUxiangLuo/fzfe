import React, { useState, useEffect } from "react";
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
    Alert
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    DownloadOutlined,
    UploadOutlined,
    FileTextOutlined
} from "@ant-design/icons";
import type { UploadFile } from 'antd/es/upload/interface';
import type { ExperimentData } from "../types";
import { apiClient } from "../../../utils/apiClient";
import { openFileWithAuth } from "../../../utils/authFile";

const { TextArea } = Input;
const { Title, Text } = Typography;

const DATASET_NAME_MIN_LENGTH = 2;
const MAX_DATASET_NAME_LENGTH = 100;
const MAX_DATASET_NOTES_LENGTH = 200;
const MAX_DATASET_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_DATASET_EXTENSIONS = [".csv"];

const ExperimentDataView: React.FC = () => {
    const [datasets, setDatasets] = useState<ExperimentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal states
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<ExperimentData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const [fileList, setFileList] = useState<UploadFile[]>([]);

    const fetchDatasets = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.get("/datasets");
            setDatasets(data || []);
        } catch (err: any) {
            message.error(err.message || "获取数据集失败");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDatasets();
    }, []);

    const handleDelete = async (datasetId: number) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除此数据集吗？此操作会删除服务器上的文件且不可恢复。',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await apiClient.delete(`/datasets/${datasetId}`);
                    setDatasets((prev) => prev.filter((d) => d.dataset_id !== datasetId));
                    message.success('删除成功');
                } catch (err: any) {
                    message.error(`删除失败: ${err.message}`);
                }
            },
        });
    };

    const handleDownload = async (filePath: string) => {
        try {
            await openFileWithAuth(filePath);
        } catch (err: any) {
            message.error(err.message || '下载失败');
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ['行业名称', '公司名称', '产品名称', '年份', '月份', '销售数量', '数量单位'];
        const examples = [
            ['电子行业', '示例科技', '智能手机', '2023', '1', '1200', '部'],
            ['电子行业', '示例科技', '智能手机', '2023', '2', '1350', '部']
        ];

        const csvContent = [
            headers.join(','),
            ...examples.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = '实验数据导入模板.csv';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleUpload = async (values: any) => {
        if (fileList.length === 0) {
            message.error('请上传数据文件');
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
        formData.append("data_name", values.name.trim());
        formData.append("description", values.notes ? values.notes.trim() : "");

        try {
            const newDataset = await apiClient.postFormData("/datasets", formData);
            setDatasets((prev) => [newDataset, ...prev]);
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
        if (!editingData) return;

        setIsSubmitting(true);
        try {
            const updatedDataset = await apiClient.put(
                `/datasets/${editingData.dataset_id}`,
                {
                    data_name: values.name.trim(),
                    description: values.notes ? values.notes.trim() : "",
                },
            );
            setDatasets((prev) =>
                prev.map((d) =>
                    d.dataset_id === updatedDataset.dataset_id ? updatedDataset : d,
                ),
            );
            setIsEditModalOpen(false);
            setEditingData(null);
            message.success('保存成功');
        } catch (err: any) {
            message.error(`保存失败: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (data: ExperimentData) => {
        setEditingData(data);
        editForm.setFieldsValue({
            name: data.data_name,
            notes: data.description
        });
        setIsEditModalOpen(true);
    }

    const columns = [
        {
            title: '数据集名称',
            dataIndex: 'data_name',
            key: 'data_name',
        },
        {
            title: '备注',
            dataIndex: 'description',
            key: 'description',
            render: (text: string | null) => text || '-',
        },
        {
            title: '上传时间',
            dataIndex: 'uploaded_at',
            key: 'uploaded_at',
            render: (text: string) => new Date(text).toLocaleString(),
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: ExperimentData) => (
                <Space size="middle">
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                        type="link"
                        aria-label={`Edit ${record.data_name}`}
                        title={`Edit ${record.data_name}`}
                    />
                    <Button
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownload(record.file_path)}
                        type="link"
                        aria-label={`Download ${record.data_name}`}
                        title={`Download ${record.data_name}`}
                    />
                    <Button
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => handleDelete(record.dataset_id)}
                        type="link"
                        aria-label={`Delete ${record.data_name}`}
                        title={`Delete ${record.data_name}`}
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
            const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
            if (!ALLOWED_DATASET_EXTENSIONS.includes(extension)) {
                message.error('仅支持上传CSV文件');
                return Upload.LIST_IGNORE;
            }
            if (file.size > MAX_DATASET_FILE_SIZE) {
                message.error('文件大小不能超过50MB');
                return Upload.LIST_IGNORE;
            }
            setFileList([file]);
            return false;
        },
        fileList,
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <Title level={3} style={{ marginBottom: 0 }}>实验数据管理</Title>
                    <Text type="secondary">管理实验所需的基础数据集，支持上传、更新操作</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsUploadModalOpen(true)}>
                    新增数据
                </Button>
            </div>

            <Card>
                <Table
                    dataSource={datasets}
                    columns={columns}
                    rowKey="dataset_id"
                    loading={isLoading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title="新增实验数据"
                open={isUploadModalOpen}
                onCancel={() => { setIsUploadModalOpen(false); form.resetFields(); setFileList([]); }}
                onOk={() => form.submit()}
                confirmLoading={isSubmitting}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleUpload}>
                    <Form.Item
                        name="name"
                        label="数据集名称"
                        rules={[
                            { required: true, message: '数据集名称不能为空', whitespace: true },
                            { min: DATASET_NAME_MIN_LENGTH, message: `数据集名称至少需要${DATASET_NAME_MIN_LENGTH}个字符` },
                            { max: MAX_DATASET_NAME_LENGTH, message: `数据集名称不能超过${MAX_DATASET_NAME_LENGTH}个字符` }
                        ]}
                    >
                        <Input placeholder="例如：苹果公司2023年销售数据" />
                    </Form.Item>
                    <Form.Item
                        name="notes"
                        label="备注"
                        rules={[{ max: MAX_DATASET_NOTES_LENGTH, message: `备注不能超过${MAX_DATASET_NOTES_LENGTH}个字符` }]}
                    >
                        <TextArea rows={3} placeholder="例如：包含了iPhone, iPad等产品的季度销售数据" />
                    </Form.Item>

                    <Alert
                        message="数据格式要求"
                        description={
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span>请确保上传的CSV文件包含列标题：行业名称, 公司名称, 产品名称, 年份, 月份, 销售数量, 数量单位</span>
                                    <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载模板</Button>
                                </div>
                            </div>
                        }
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />

                    <Form.Item label="上传数据文件" required>
                        <Upload {...uploadProps} maxCount={1} accept=".csv">
                            <Button icon={<UploadOutlined />}>选择文件</Button>
                        </Upload>
                        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>仅支持CSV格式，文件大小不超过50MB</Text>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="修改实验数据"
                open={isEditModalOpen}
                onCancel={() => { setIsEditModalOpen(false); setEditingData(null); editForm.resetFields(); }}
                onOk={() => editForm.submit()}
                confirmLoading={isSubmitting}
            >
                <Form form={editForm} layout="vertical" onFinish={handleEdit}>
                    <Form.Item
                        name="name"
                        label="数据集名称"
                        rules={[
                            { required: true, message: '数据集名称不能为空', whitespace: true },
                            { min: DATASET_NAME_MIN_LENGTH, message: `数据集名称至少需要${DATASET_NAME_MIN_LENGTH}个字符` },
                            { max: MAX_DATASET_NAME_LENGTH, message: `数据集名称不能超过${MAX_DATASET_NAME_LENGTH}个字符` }
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="notes"
                        label="备注"
                        rules={[{ max: MAX_DATASET_NOTES_LENGTH, message: `备注不能超过${MAX_DATASET_NOTES_LENGTH}个字符` }]}
                    >
                        <TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ExperimentDataView;
