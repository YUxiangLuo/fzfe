import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Avatar, Dropdown, Modal, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
    ExperimentOutlined,
    FileTextOutlined,
    HistoryOutlined,
    TeamOutlined,
    UserOutlined,
    SettingOutlined,
    QuestionCircleOutlined,
    PercentageOutlined,
    BarChartOutlined,
    SolutionOutlined,
    LogoutOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
} from '@ant-design/icons';
import { decodeToken, type DecodedToken } from '../../../../utils/auth';
import { getRoleByBackendValue } from '../../../../config/roles';
import { useRole } from '../../contexts/RoleContext';

const PersonalInfo = lazy(() => import('../Account/PersonalInfo'));
const AssistantManagement = lazy(() => import('../Account/AssistantManagement'));
const ClassManagement = lazy(() => import('../Class/ClassManagement'));
const StudentManagement = lazy(() => import('../Student/StudentManagement'));
const ExperimentProgress = lazy(() => import('../Experiment/ExperimentProgress'));
const ExperimentReports = lazy(() => import('../Experiment/ExperimentReports'));
const ExperimentLogs = lazy(() => import('../Experiment/ExperimentLogs'));
const QuestionBank = lazy(() => import('../Assessment/QuestionBank'));
const GradeWeights = lazy(() => import('../Assessment/GradeWeights'));
const GradesOverview = lazy(() => import('../Assessment/GradesOverview'));

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const RouteLoading: React.FC = () => (
    <div style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
    </div>
);

type MenuItemType = Required<MenuProps>['items'][number];

function getOpenKeysByPath(pathname: string): string[] {
    if (pathname.startsWith('/experiment')) return ['experiment'];
    if (pathname.startsWith('/assessment')) return ['assessment'];
    if (pathname.startsWith('/account')) return ['account'];
    return [];
}

const TeacherLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [currentUser, setCurrentUser] = useState<DecodedToken | null>(null);
    const [isAuthorizing, setIsAuthorizing] = useState(true);
    const [openKeys, setOpenKeys] = useState<string[]>([]);
    const navigate = useNavigate();
    const location = useLocation();
    const { role } = useRole();

    const currentRoleId = React.useMemo<'teacher' | 'assistant' | null>(() => {
        const tokenRole = (currentUser?.role ?? '').toLowerCase();
        if (tokenRole === 'teacher' || tokenRole === 'assistant') {
            return tokenRole;
        }
        if (role?.id === 'teacher' || role?.id === 'assistant') {
            return role.id;
        }
        return null;
    }, [currentUser?.role, role?.id]);

    useEffect(() => {
        const redirectToLogin = () => {
            window.location.href = '/login.html';
        };

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                redirectToLogin();
                return;
            }

            const decoded = decodeToken(token);
            const normalizedRole = (decoded?.role ?? '').toLowerCase();
            if (!decoded || (normalizedRole !== 'teacher' && normalizedRole !== 'assistant')) {
                redirectToLogin();
                return;
            }

            setCurrentUser(decoded);
            setIsAuthorizing(false);
        } catch (err) {
            console.error('Failed to read token from localStorage:', err);
            window.location.href = '/login.html';
        }
    }, []);

    const roleDisplay = currentUser
        ? getRoleByBackendValue(currentUser.role)?.displayName ?? currentUser.role
        : null;

    // Menu items with nested structure - filtered by role
    const menuItems = React.useMemo<MenuItemType[]>(() => {
        const items: MenuItemType[] = [
        {
            key: 'experiment',
            icon: <ExperimentOutlined />,
            label: '实验管理',
            children: [
                {
                    key: '/experiment-progress',
                    icon: <ExperimentOutlined />,
                    label: '实验进度',
                },
                {
                    key: '/experiment-reports',
                    icon: <FileTextOutlined />,
                    label: '实验报告',
                },
                {
                    key: '/experiment-logs',
                    icon: <HistoryOutlined />,
                    label: '实验日志',
                },
            ],
        },
        {
            key: '/class-management',
            icon: <TeamOutlined />,
            label: '班级管理',
        },
        {
            key: '/student-management',
            icon: <SolutionOutlined />,
            label: '学生管理',
        },
        {
            key: 'assessment',
            icon: <BarChartOutlined />,
            label: '考核管理',
            children: [
                {
                    key: '/assessment-questions',
                    icon: <QuestionCircleOutlined />,
                    label: '题库管理',
                },
                {
                    key: '/assessment-weights',
                    icon: <PercentageOutlined />,
                    label: '成绩权重',
                },
                {
                    key: '/assessment-grades',
                    icon: <BarChartOutlined />,
                    label: '成绩总览',
                },
            ],
        },
        {
            key: 'account',
            icon: <SettingOutlined />,
            label: '账户设置',
            children: [
                {
                    key: '/account-personal',
                    icon: <UserOutlined />,
                    label: '个人信息',
                },
                // 助教不显示"助教管理"菜单
                ...(currentRoleId !== 'assistant' ? [{
                    key: '/account-assistant',
                    icon: <TeamOutlined />,
                    label: '助教管理',
                } as MenuItemType] : []),
            ],
        },
        ];

        return items;
    }, [currentRoleId]);

    useEffect(() => {
        setOpenKeys(getOpenKeysByPath(location.pathname));
    }, [location.pathname]);

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
                try {
                    localStorage.removeItem('token');
                } catch (err) {
                    console.error('Failed to remove token from localStorage:', err);
                }
                window.location.href = '/login.html';
            },
        });
    };

    const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
        if (key.startsWith('/')) {
            navigate(key);
        }
    };

    // Get selected keys and open keys from current path
    const getSelectedKeys = () => {
        return [location.pathname];
    };

    const userMenu: MenuProps = {
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
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                theme="light"
                width={250}
                style={{
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    zIndex: 10
                }}
            >
                <div style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    {!collapsed && <Title level={4} style={{ margin: 0, color: '#1890ff' }}>Teacher Portal</Title>}
                    {collapsed && <Title level={4} style={{ margin: 0, color: '#1890ff' }}>T</Title>}
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={getSelectedKeys()}
                    openKeys={openKeys}
                    onOpenChange={(nextKeys) => setOpenKeys(nextKeys as string[])}
                    onClick={handleMenuClick}
                    items={menuItems}
                    style={{ borderRight: 0 }}
                />
            </Sider>
            <Layout>
                <Header style={{
                    padding: '0 24px',
                    background: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    zIndex: 1
                }}>
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
                            <Avatar style={{ backgroundColor: '#52c41a', cursor: 'pointer' }} icon={<UserOutlined />} />
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
                    <Suspense fallback={<RouteLoading />}>
                        <Routes>
                            {/* Default redirect */}
                            <Route path="/" element={<Navigate to="/experiment-progress" replace />} />

                            {/* Phase 5: Experiment */}
                            <Route path="/experiment-progress" element={<ExperimentProgress />} />
                            <Route path="/experiment-reports" element={<ExperimentReports />} />
                            <Route path="/experiment-logs" element={<ExperimentLogs />} />

                            {/* Phase 3: Class */}
                            <Route path="/class-management" element={<ClassManagement />} />

                            {/* Phase 4: Student */}
                            <Route path="/student-management" element={<StudentManagement />} />

                            {/* Phase 6: Assessment */}
                            <Route path="/assessment-questions" element={<QuestionBank />} />
                            <Route path="/assessment-weights" element={<GradeWeights />} />
                            <Route path="/assessment-grades" element={<GradesOverview />} />

                            {/* Phase 2: Account */}
                            <Route path="/account-personal" element={<PersonalInfo />} />
                            <Route
                                path="/account-assistant"
                                element={currentRoleId === 'assistant'
                                    ? <Navigate to="/account-personal" replace />
                                    : <AssistantManagement />}
                            />
                        </Routes>
                    </Suspense>
                </Content>
            </Layout>
        </Layout>
    );
};

export default TeacherLayout;
