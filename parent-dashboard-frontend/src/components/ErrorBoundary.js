// ErrorBoundary.js
// Comprehensive error boundary with fallback UI and error reporting
'use client';

import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    // In a real app, you would send this to your error reporting service
    // Examples: Sentry, LogRocket, Bugsnag, etc.

    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount
    };

    // For now, just log it
    console.error('Error Report:', errorReport);

    // Example: Send to error service
    // errorReportingService.captureException(error, { extra: errorReport });
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI based on error boundary type
      const { fallback, minimal = false } = this.props;

      if (fallback) {
        return fallback(this.state.error, this.handleRetry);
      }

      if (minimal) {
        return (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm text-red-800">Something went wrong</span>
              <button
                onClick={this.handleRetry}
                className="ml-auto text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        );
      }

      // Full error boundary UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
            <div className="flex justify-center mb-4">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Oops! Something went wrong
            </h2>

            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. This has been reported to our team.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
                <details className="text-sm">
                  <summary className="font-medium text-gray-700 cursor-pointer mb-2">
                    Error Details (Development Mode)
                  </summary>
                  <div className="text-red-600 font-mono text-xs whitespace-pre-wrap">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </div>
                </details>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                variant="secondary"
                onClick={this.handleRetry}
                className="flex items-center"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Try Again
              </Button>

              <Button
                variant="primary"
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
            </div>

            {this.state.retryCount > 0 && (
              <p className="text-xs text-gray-500 mt-4">
                Retry attempts: {this.state.retryCount}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Specialized error boundaries for different contexts
export const DashboardErrorBoundary = ({ children }) => (
  <ErrorBoundary
    fallback={(error, retry) => (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h3 className="font-medium text-red-800">Dashboard Error</h3>
              <p className="text-sm text-red-600 mt-1">
                Unable to load dashboard content. Please try again.
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export const ModalErrorBoundary = ({ children }) => (
  <ErrorBoundary minimal={true}>
    {children}
  </ErrorBoundary>
);

export const FormErrorBoundary = ({ children }) => (
  <ErrorBoundary
    fallback={(error, retry) => (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-800">
              Form error occurred. Please refresh and try again.
            </span>
          </div>
          <button
            onClick={retry}
            className="text-sm text-yellow-600 hover:text-yellow-800 underline ml-4"
          >
            Retry
          </button>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;
