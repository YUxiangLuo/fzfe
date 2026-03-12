import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, Avatar, Dropdown, Modal, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
    BookOutlined,
    DatabaseOutlined,
    UserOutlined,
    TeamOutlined,
    LogoutOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { DecodedToken } from '../../../utils/auth';
import { getRoleByBackendValue } from '../../../config/roles';
import {
    clearSessionAndRedirect,
    getSessionUser,
    hasSessionRole,
    isSessionExpired,
} from '../../../utils/session';
import { ADMIN_DEFAULT_ROUTE, ADMIN_ROUTES } from '../routes';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const AdminLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [currentUser, setCurrentUser] = useState<DecodedToken | null>(null);
    const [isAuthorizing, setIsAuthorizing] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const user = getSessionUser();
        if (!user || isSessionExpired(user) || !hasSessionRole(user, ['admin'])) {
            clearSessionAndRedirect();
            return;
        }

        setCurrentUser(user);
        setIsAuthorizing(false);
    }, []);

    if (isAuthorizing) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    const handleLogout = () => {
        Modal.confirm({
            title: '确认退出',
            content: '确定要退出登录吗？退出后需要重新登录才能继续操作。',
            okText: '退出',
            okType: 'danger',
            cancelText: '取消',
            onOk: () => {
                clearSessionAndRedirect();
            },
        });
    };

    const roleDisplay = currentUser
        ? getRoleByBackendValue(currentUser.role)?.displayName ?? currentUser.role
        : null;

    const menuItems: Required<MenuProps>['items'] = [
        {
            key: ADMIN_ROUTES.EXPERIMENT_MANUAL,
            icon: <BookOutlined />,
            label: '实验手册管理',
        },
        {
            key: ADMIN_ROUTES.EXPERIMENT_DATA,
            icon: <DatabaseOutlined />,
            label: '实验数据管理',
        },
        {
            key: ADMIN_ROUTES.USER_MANAGEMENT,
            icon: <UserOutlined />,
            label: '用户管理',
        },
        {
            key: ADMIN_ROUTES.CLASS_MANAGEMENT,
            icon: <TeamOutlined />,
            label: '班级管理',
        },
    ];

    const selectedMenuKey = location.pathname === ADMIN_ROUTES.ROOT
        ? ADMIN_DEFAULT_ROUTE
        : location.pathname;

    const userMenu = {
        items: [
            {
                key: 'logout',
                label: '退出登录',
                icon: <LogoutOutlined />,
                danger: true,
                onClick: handleLogout,
            },
        ],
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} theme="light" width={250} style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 10
            }}>
                <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
                    {/* Logo area, can be added later */}
                    {!collapsed && <Title level={4} style={{ margin: 0, color: '#1890ff' }}>管理员端</Title>}
                    {collapsed && <Title level={4} style={{ margin: 0, color: '#1890ff' }}>管</Title>}
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={[selectedMenuKey]}
                    onClick={({ key }) => navigate(String(key))}
                    items={menuItems}
                    style={{ borderRight: 0 }}
                />
            </Sider>
            <Layout>
                <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', zIndex: 1 }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            fontSize: '16px',
                            width: 64,
                            height: 64,
                        }}
                    />

                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <Title level={5} style={{ margin: 0 }}>面向企业多源需求融合的生产计划决策虚拟仿真系统</Title>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
                            <Text strong style={{ display: 'block' }}>{currentUser?.username || "未知用户"}</Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>{roleDisplay}</Text>
                        </div>
                        <Dropdown menu={userMenu}>
                            <Avatar style={{ backgroundColor: '#1890ff', cursor: 'pointer' }} icon={<UserOutlined />} />
                        </Dropdown>
                    </div>
                </Header>
                <Content
                    style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 280,
                        background: '#fff',
                        borderRadius: 8,
                        overflow: 'auto',
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;
