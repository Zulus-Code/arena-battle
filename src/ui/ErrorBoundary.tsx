// ─── Error Boundary ───────────────────────────────────────────────────────────
// Catches render errors and shows a fallback UI instead of a white screen.

import React from 'react';

interface ErrorBoundaryProps {
  readonly children: React.ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white gap-4 p-8">
          <h1 className="text-2xl font-bold text-red-400">Что-то пошло не так</h1>
          <p className="text-gray-400 text-sm max-w-md text-center">
            {this.state.error?.message ?? 'Неизвестная ошибка'}
          </p>
          <button
            className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors"
            onClick={() => window.location.reload()}
          >
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
