import React, { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { RoleProvider, useRole } from './contexts/RoleContext';
import { getRoleById } from '../../config/roles';
import TeacherLayout from './components/Layout/TeacherLayout';

function AppContent() {
    const { setRole } = useRole();

    useEffect(() => {
        const storedRole = localStorage.getItem('userRole');
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
        <RoleProvider>
            <HashRouter>
                <AppContent />
            </HashRouter>
        </RoleProvider>
    );
}

export default App;
