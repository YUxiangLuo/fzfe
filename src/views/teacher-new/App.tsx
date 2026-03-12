import React, { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { RoleProvider, useRole } from './contexts/RoleContext';
import { getRoleById } from '../../config/roles';
import TeacherLayout from './components/Layout/TeacherLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { getStoredTeacherPortalRole } from '../../utils/session';

function AppContent() {
    const { setRole } = useRole();

    useEffect(() => {
        const storedRole = getStoredTeacherPortalRole();
        if (storedRole) {
            const roleObject = getRoleById(storedRole);
            if (roleObject) {
                setRole(roleObject);
            }
        }
    }, [setRole]);

    return <TeacherLayout />;
}

function App() {
    return (
        <ErrorBoundary>
            <RoleProvider>
                <HashRouter>
                    <AppContent />
                </HashRouter>
            </RoleProvider>
        </ErrorBoundary>
    );
}

export default App;
