import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import ExperimentManualView from './components/ExperimentManual';
import ExperimentDataView from './components/ExperimentData';
import UserManagement from './components/UserManagement';
import ClassManagement from './components/ClassManagement';
import { ADMIN_DEFAULT_ROUTE, ADMIN_ROUTES } from './routes';

function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path={ADMIN_ROUTES.ROOT} element={<AdminLayout />}>
                    <Route index element={<Navigate to={ADMIN_DEFAULT_ROUTE} replace />} />
                    <Route path={ADMIN_ROUTES.EXPERIMENT_MANUAL.slice(1)} element={<ExperimentManualView />} />
                    <Route path={ADMIN_ROUTES.EXPERIMENT_DATA.slice(1)} element={<ExperimentDataView />} />
                    <Route path={ADMIN_ROUTES.USER_MANAGEMENT.slice(1)} element={<UserManagement />} />
                    <Route path={ADMIN_ROUTES.CLASS_MANAGEMENT.slice(1)} element={<ClassManagement />} />
                    <Route path="*" element={<Navigate to={ADMIN_ROUTES.ROOT} replace />} />
                </Route>
            </Routes>
        </HashRouter>
    );
}

export default App;
