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
import type { DecodedToken } from '../../../../utils/auth';
import { getRoleByBackendValue } from '../../../../config/roles';
import { useRole } from '../../contexts/RoleContext';
import {
    clearSessionAndRedirect,
    getSessionUser,
    hasSessionRole,
    isSessionExpired,
} from '../../../../utils/session';
import { listManagedClasses } from '../../utils/portalApi';

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
const TEACHER_OPERATION_MANUAL_HREF = '/operation-manuals/teacher.html';
const ASSISTANT_OPERATION_MANUAL_HREF = '/operation-manuals/assistant.html';

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
    const [assistantHasManagedClasses, setAssistantHasManagedClasses] = useState<boolean | null>(null);
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
        const user = getSessionUser();
        if (!user || isSessionExpired(user) || !hasSessionRole(user, ['teacher', 'assistant'])) {
            clearSessionAndRedirect();
            return;
        }

        setCurrentUser(user);
        setIsAuthorizing(false);
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        if (currentRoleId !== 'assistant') {
            setAssistantHasManagedClasses(null);
            return;
        }

        let cancelled = false;
        setAssistantHasManagedClasses(null);

        listManagedClasses()
            .then((classes) => {
                if (!cancelled) {
                    setAssistantHasManagedClasses(classes.length > 0);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setAssistantHasManagedClasses(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [currentUser, currentRoleId]);

    const canAccessAssessment = currentRoleId !== 'assistant' || assistantHasManagedClasses === true;
    const isAssessmentPermissionLoading = currentRoleId === 'assistant' && assistantHasManagedClasses === null;

    const roleDisplay = currentUser
        ? getRoleByBackendValue(currentUser.role)?.displayName ?? currentUser.role
        : null;

    const portalTitle = currentRoleId === 'assistant' ? '助教端' : '教师端';
    const collapsedPortalTitle = currentRoleId === 'assistant' ? '助' : '教';
    const operationManualHref = currentRoleId === 'assistant'
        ? ASSISTANT_OPERATION_MANUAL_HREF
        : TEACHER_OPERATION_MANUAL_HREF;

    // Menu items with nested structure - filtered by role
    const menuItems = React.useMemo<MenuItemType[]>(() => {
        const assessmentMenuItem: MenuItemType = {
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
        };

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
        ...(canAccessAssessment ? [assessmentMenuItem] : []),
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
    }, [canAccessAssessment, currentRoleId]);

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
                clearSessionAndRedirect();
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

    const renderAssessmentRoute = (element: React.ReactElement) => {
        if (isAssessmentPermissionLoading) {
            return <RouteLoading />;
        }
        return canAccessAssessment ? element : <Navigate to="/experiment-progress" replace />;
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
                    {!collapsed && <Title level={4} style={{ margin: 0, color: '#1890ff' }}>{portalTitle}</Title>}
                    {collapsed && <Title level={4} style={{ margin: 0, color: '#1890ff' }}>{collapsedPortalTitle}</Title>}
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
                        <Title level={5} style={{ margin: 0 }}>面向企业的需求预测与生产计划决策虚拟仿真系统</Title>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Button
                            href={operationManualHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            icon={<QuestionCircleOutlined />}
                        >
                            操作手册
                        </Button>
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
                            <Route path="/question-bank" element={<Navigate to="/assessment-questions" replace />} />
                            <Route path="/assessment-questions" element={renderAssessmentRoute(<QuestionBank />)} />
                            <Route path="/assessment-weights" element={renderAssessmentRoute(<GradeWeights />)} />
                            <Route path="/assessment-grades" element={renderAssessmentRoute(<GradesOverview />)} />

                            {/* Phase 2: Account */}
                            <Route path="/account-personal" element={<PersonalInfo />} />
                            <Route
                                path="/account-assistant"
                                element={currentRoleId === 'assistant'
                                    ? <Navigate to="/account-personal" replace />
                                    : <AssistantManagement />}
                            />
                            <Route path="*" element={<Navigate to="/experiment-progress" replace />} />
                        </Routes>
                    </Suspense>
                </Content>
            </Layout>
        </Layout>
    );
};

export default TeacherLayout;
