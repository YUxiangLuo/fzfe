import React, { useEffect, useState } from "react";
import {
    Button,
    Card,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
    message,
} from "antd";
import {
    CheckCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import { apiClient } from "../../../utils/apiClient";
import type { AcademicTerm } from "../types";

const { Title } = Typography;
const { confirm } = Modal;

interface AcademicTermFormValues {
    academic_year: string;
    semester: 1 | 2;
    is_active?: boolean;
}

const semesterOptions = [
    { value: 1, label: "第一学期" },
    { value: 2, label: "第二学期" },
];

const getErrorMessage = (error: unknown, fallback: string) => {
    return error instanceof Error ? error.message : fallback;
};

const AcademicTermManagement: React.FC = () => {
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
    const [form] = Form.useForm<AcademicTermFormValues>();

    const fetchTerms = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.get<AcademicTerm[]>("/academic-terms");
            setTerms(data || []);
        } catch (error: unknown) {
            message.error(getErrorMessage(error, "获取学年学期失败"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTerms();
    }, []);

    const openCreateModal = () => {
        setEditingTerm(null);
        form.setFieldsValue({ academic_year: "", semester: 1, is_active: false });
        setModalOpen(true);
    };

    const openEditModal = (term: AcademicTerm) => {
        setEditingTerm(term);
        form.setFieldsValue({
            academic_year: term.academic_year,
            semester: term.semester,
            is_active: term.is_active,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (values: AcademicTermFormValues) => {
        setIsSaving(true);
        try {
            if (editingTerm) {
                await apiClient.put(`/academic-terms/${editingTerm.term_id}`, values);
                message.success("学期已更新");
            } else {
                await apiClient.post("/academic-terms", values);
                message.success("学期已创建");
            }
            setModalOpen(false);
            setEditingTerm(null);
            form.resetFields();
            fetchTerms();
        } catch (error: unknown) {
            message.error(getErrorMessage(error, editingTerm ? "更新失败" : "创建失败"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetCurrent = async (term: AcademicTerm) => {
        if (term.is_active) return;
        setIsSaving(true);
        try {
            await apiClient.put(`/academic-terms/${term.term_id}`, { is_active: true });
            message.success("当前学期已更新");
            fetchTerms();
        } catch (error: unknown) {
            message.error(getErrorMessage(error, "设置当前学期失败"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (term: AcademicTerm) => {
        confirm({
            title: `确定删除 ${term.term_label} 吗？`,
            content: "已有班级的学期不能删除。",
            okText: "删除",
            okType: "danger",
            cancelText: "取消",
            onOk: async () => {
                try {
                    await apiClient.delete(`/academic-terms/${term.term_id}`);
                    message.success("学期已删除");
                    fetchTerms();
                } catch (error: unknown) {
                    message.error(getErrorMessage(error, "删除失败"));
                }
            },
        });
    };

    const columns = [
        {
            title: "学年/学期",
            dataIndex: "term_label",
            key: "term_label",
        },
        {
            title: "状态",
            dataIndex: "is_active",
            key: "is_active",
            render: (isActive: boolean) => isActive ? <Tag color="green">当前学期</Tag> : <Tag>历史学期</Tag>,
        },
        {
            title: "班级数",
            dataIndex: "class_count",
            key: "class_count",
            render: (value: number | undefined) => value ?? 0,
        },
        {
            title: "操作",
            key: "action",
            render: (_: unknown, record: AcademicTerm) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEditModal(record)}>
                        编辑
                    </Button>
                    <Button
                        icon={<CheckCircleOutlined />}
                        size="small"
                        type={record.is_active ? "primary" : "default"}
                        disabled={record.is_active || isSaving}
                        onClick={() => handleSetCurrent(record)}
                    >
                        设为当前
                    </Button>
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        disabled={record.is_active}
                        onClick={() => handleDelete(record)}
                    >
                        删除
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Title level={3} style={{ marginBottom: 0 }}>学年学期管理</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    新增学期
                </Button>
            </div>

            <Card>
                <Table
                    dataSource={terms}
                    columns={columns}
                    rowKey="term_id"
                    loading={isLoading}
                    pagination={false}
                />
            </Card>

            <Modal
                title={editingTerm ? "编辑学期" : "新增学期"}
                open={modalOpen}
                onCancel={() => {
                    setModalOpen(false);
                    setEditingTerm(null);
                    form.resetFields();
                }}
                onOk={() => form.submit()}
                confirmLoading={isSaving}
                okText={editingTerm ? "保存" : "创建"}
                cancelText="取消"
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        label="学年"
                        name="academic_year"
                        rules={[
                            { required: true, message: "请输入学年", whitespace: true },
                            { max: 20, message: "学年不能超过20个字符" },
                        ]}
                    >
                        <Input placeholder="例如：2025-2026" />
                    </Form.Item>
                    <Form.Item
                        label="学期"
                        name="semester"
                        rules={[{ required: true, message: "请选择学期" }]}
                    >
                        <Select options={semesterOptions} />
                    </Form.Item>
                    <Form.Item label="设为当前学期" name="is_active" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AcademicTermManagement;
