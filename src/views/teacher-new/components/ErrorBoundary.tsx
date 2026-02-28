import React from 'react';
import { Result, Button } from 'antd';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    ErrorBoundaryState
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    override render() {
        if (this.state.hasError) {
            return (
                <Result
                    status="error"
                    title="页面出现错误"
                    subTitle={this.state.error?.message || '发生未知错误，请刷新页面重试。'}
                    extra={[
                        <Button
                            type="primary"
                            key="reload"
                            onClick={() => window.location.reload()}
                        >
                            刷新页面
                        </Button>,
                        <Button key="retry" onClick={this.handleReset}>
                            重试
                        </Button>,
                    ]}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
