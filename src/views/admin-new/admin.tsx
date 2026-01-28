import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd"; // Import ConfigProvider for potential theme customization
import zhCN from 'antd/locale/zh_CN';
import App from "./App.tsx";
import "./admin.css"; // Ensure we have some base styles if needed, or create a new one

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ConfigProvider locale={zhCN}>
            <App />
        </ConfigProvider>
    </StrictMode>,
);
