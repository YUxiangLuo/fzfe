import React, { useState, useEffect } from 'react';
import {
    Card,
    Form,
    Input,
    Button,
    Descriptions,
    Modal,
    message,
    Spin,
    Alert,
    Typography,
    Tag,
    List
} from 'antd';
import {
    UserOutlined,
    PhoneOutlined,
    MailOutlined,
    CalendarOutlined,
    EditOutlined,
    SaveOutlined,
    LockOutlined,
    BookOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import type { User, Class } from '../../types';
import { formatDate } from '../../utils/format';
import { isAbortError, getErrorMessage, isFormValidationError } from '../../utils/error';

const { Title, Text } = Typography;

const PersonalInfo: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [managedClasses, setManagedClasses] = useState<Class[]>([]);

    const [isUserLoading, setIsUserLoading] = useState(true);
    const [isClassesLoading, setIsClassesLoading] = useState(true);
    const [userError, setUserError] = useState<string | null>(null);
    const [classesError, setClassesError] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [editForm] = Form.useForm();
    const [passwordForm] = Form.useForm();

    useEffect(() => {
        const controller = new AbortController();

        const fetchInitialData = async () => {
            let userData: User | null = null;
            try {
                setIsUserLoading(true);
                setUserError(null);
                userData = await apiClient.get<User>('/users/me', { signal: controller.signal });

                if (!controller.signal.aborted) {
                    setUser(userData);
                    setIsUserLoading(false);
                }
            } catch (err: unknown) {
                if (isAbortError(err)) return;
                if (!controller.signal.aborted) {
                    setUserError(getErrorMessage(err, '获取用户信息失败'));
                    setIsUserLoading(false);
                }
                return;
            }

            if (userData && userData.user_id && !controller.signal.aborted) {
                try {
                    setIsClassesLoading(true);
                    setClassesError(null);
                    const classesData = await apiClient.get(`/teachers/${userData.user_id}/classes`, { signal: controller.signal });

                    if (!controller.signal.aborted) {
                        setManagedClasses(classesData || []);
                        setIsClassesLoading(false);
                    }
                } catch (err: unknown) {
                    if (isAbortError(err)) return;
                    if (!controller.signal.aborted) {
                        setClassesError(getErrorMessage(err, '获取班级信息失败'));
                        setIsClassesLoading(false);
                    }
                }
            }
        };

        fetchInitialData();

        return () => {
            controller.abort();
        };
    }, []);

    const handleOpenEditModal = () => {
        if (user) {
            editForm.setFieldsValue({
                full_name: user.full_name,
                phone_number: user.phone_number || '',
                email: user.email,
            });
            setIsEditModalOpen(true);
        }
    };

    const handleSaveEdit = async () => {
        try {
            const values = await editForm.validateFields();
            setIsSaving(true);

            const updatedUser = await apiClient.put('/users/me', {
                full_name: values.full_name.trim(),
                phone_number: values.phone_number?.trim() || null,
                email: values.email.trim(),
            });

            setUser(updatedUser);
            setIsEditModalOpen(false);
            message.success('个人信息保存成功');
        } catch (err: unknown) {
            if (isFormValidationError(err)) {
                // Form validation error, don't show message
                return;
            }
            message.error(getErrorMessage(err, '保存失败，请稍后重试'));
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordSubmit = async (values: { currentPassword: string; newPassword: string }) => {
        try {
            await apiClient.put('/users/me/password', {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            });
            message.success('密码修改成功！');
            passwordForm.resetFields();
        } catch (err: unknown) {
            const msg = getErrorMessage(err, '密码修改失败，请稍后重试。');
            if (msg.includes('Invalid current password')) {
                message.error('当前密码不正确，请重新输入。');
            } else {
                message.error(msg);
            }
        }
    };

    if (isUserLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Spin size="large">
                    <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>
                </Spin>
            </div>
        );
    }

    if (userError) {
        return <Alert message="加载失败" description={userError} type="error" showIcon />;
    }

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ marginBottom: 4 }}>个人信息管理</Title>
                <Text type="secondary">管理您的个人资料和基本信息</Text>
            </div>

            {/* 基本信息卡片 */}
            <Card
                title={
                    <span>
                        <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                        基本信息
                    </span>
                }
                extra={
                    <Button type="primary" ghost icon={<EditOutlined />} onClick={handleOpenEditModal}>
                        编辑信息
                    </Button>
                }
                style={{ marginBottom: 24 }}
            >
                {user && (
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered>
                        <Descriptions.Item label={<><UserOutlined /> 姓名</>}>
                            {user.full_name || '未设置'}
                        </Descriptions.Item>
                        <Descriptions.Item label={<><PhoneOutlined /> 手机号码</>}>
                            {user.phone_number || '未设置'}
                        </Descriptions.Item>
                        <Descriptions.Item label={<><MailOutlined /> 邮箱</>}>
                            {user.email || '未设置'}
                        </Descriptions.Item>
                        <Descriptions.Item label={<><CalendarOutlined /> 注册时间</>}>
                            {formatDate(user.created_at)}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Card>

            {/* 管理的班级卡片 */}
            <Card
                title={
                    <span>
                        <BookOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                        管理的班级
                    </span>
                }
                style={{ marginBottom: 24 }}
            >
                {isClassesLoading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <Spin />
                    </div>
                ) : classesError ? (
                    <Alert description={classesError} type="error" showIcon />
                ) : managedClasses.length === 0 ? (
                    <Text type="secondary">您当前未管理任何班级。</Text>
                ) : (
                    <List
                        grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3 }}
                        dataSource={managedClasses}
                        renderItem={(cls) => (
                            <List.Item>
                                <Card size="small">
                                    <div>
                                        <Text strong>{cls.class_name}</Text>
                                    </div>
                                    <Tag color="blue" style={{ marginTop: 8 }}>{cls.class_code}</Tag>
                                </Card>
                            </List.Item>
                        )}
                    />
                )}
            </Card>

            {/* 修改密码卡片 */}
            <Card
                title={
                    <span>
                        <LockOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
                        修改密码
                    </span>
                }
            >
                <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handlePasswordSubmit}
                    style={{ maxWidth: 600 }}
                >
                    <Form.Item
                        label="当前密码"
                        name="currentPassword"
                        rules={[{ required: true, message: '请输入当前密码' }]}
                    >
                        <Input.Password placeholder="请输入当前密码" />
                    </Form.Item>
                    <Form.Item
                        label="新密码"
                        name="newPassword"
                        rules={[
                            { required: true, message: '请输入新密码' },
                            { min: 6, message: '密码长度不能少于6个字符' },
                        ]}
                    >
                        <Input.Password placeholder="至少6个字符" />
                    </Form.Item>
                    <Form.Item
                        label="确认新密码"
                        name="confirmPassword"
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
                        <Input.Password placeholder="再次输入新密码" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                            保存新密码
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            {/* 编辑个人信息弹窗 */}
            <Modal
                title="编辑个人信息"
                open={isEditModalOpen}
                onCancel={() => setIsEditModalOpen(false)}
                onOk={handleSaveEdit}
                confirmLoading={isSaving}
                okText="保存修改"
                cancelText="取消"
            >
                <Form form={editForm} layout="vertical">
                    <Form.Item
                        label="姓名"
                        name="full_name"
                        rules={[
                            { required: true, message: '请输入姓名', whitespace: true },
                            { min: 2, message: '姓名至少2个字符' },
                            { max: 20, message: '姓名最多20个字符' },
                        ]}
                    >
                        <Input placeholder="请输入姓名" />
                    </Form.Item>
                    <Form.Item
                        label="手机号码（可选）"
                        name="phone_number"
                        rules={[
                            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' },
                        ]}
                    >
                        <Input placeholder="请输入11位手机号" />
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
                </Form>
            </Modal>
        </div>
    );
};

export default PersonalInfo;
