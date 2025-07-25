'use client';

// Error Boundary Component for Better Error Handling
import React from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV === 'development';
      
      return (
        <div className="min-h-screen bg-[var(--background-main)] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[var(--background-card)] rounded-[var(--radius-xl)] p-6 shadow-lg border border-[var(--border-subtle)] text-center">
            <div className="mb-4">
              <FiAlertTriangle 
                className="mx-auto text-[var(--accent-red)] mb-3" 
                size={48}
                aria-hidden="true"
              />
              <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-[var(--text-secondary)] text-sm">
                Don't worry - this happens sometimes. Let's try to get you back on track.
              </p>
            </div>

            {isDev && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-xs text-[var(--text-tertiary)] cursor-pointer mb-2">
                  Technical Details (Development)
                </summary>
                <div className="bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 rounded-[var(--radius-md)] p-3 text-xs font-mono overflow-auto max-h-32">
                  <div className="text-[var(--accent-red)] font-semibold mb-1">
                    {this.state.error.toString()}
                  </div>
                  <div className="text-[var(--text-tertiary)]">
                    {this.state.errorInfo.componentStack}
                  </div>
                </div>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center space-x-2 bg-[var(--accent-blue)] text-[var(--accent-blue-text-on)] px-4 py-2.5 rounded-[var(--radius-lg)] hover:bg-[var(--accent-blue-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2"
                aria-label="Try again"
              >
                <FiRefreshCw size={16} aria-hidden="true" />
                <span>Try Again</span>
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center justify-center space-x-2 bg-[var(--accent-yellow)] text-[var(--accent-yellow-text-on)] px-4 py-2.5 rounded-[var(--radius-lg)] hover:bg-[var(--accent-yellow-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-yellow)] focus-visible:ring-offset-2"
                aria-label="Go to homepage"
              >
                <FiHome size={16} aria-hidden="true" />
                <span>Go Home</span>
              </button>
            </div>

            <p className="text-xs text-[var(--text-tertiary)] mt-4">
              If this keeps happening, please try refreshing your browser or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;