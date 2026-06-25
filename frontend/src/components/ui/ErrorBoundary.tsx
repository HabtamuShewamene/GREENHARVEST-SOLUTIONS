'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <span className="material-symbols-outlined text-[64px] text-red-300 mb-4">error_outline</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred. Please refresh the page.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-2 bg-[#2d9a33] text-white rounded-lg font-bold hover:bg-[#25822a] transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
