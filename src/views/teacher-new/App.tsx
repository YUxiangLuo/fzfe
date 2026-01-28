import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import TeacherLayout from './components/Layout/TeacherLayout';

function App() {
    return (
        <BrowserRouter basename="/teacher">
            <TeacherLayout />
        </BrowserRouter>
    );
}

export default App;
