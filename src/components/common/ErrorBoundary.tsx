import React from 'react';
import { Component, ReactNode } from 'react';
import { View, Text, Button } from '@tarojs/components';
import './index.less';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="error-boundary">
          <Text className="error-icon">⚠️</Text>
          <Text className="error-title">出了点问题</Text>
          <Text className="error-message">{this.state.error?.message || '未知错误'}</Text>
          <Button className="retry-btn" onClick={this.handleRetry}>
            重试
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}