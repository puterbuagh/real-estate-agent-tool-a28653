"use client";

import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  context?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", {
      context: this.props.context,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isRootBoundary = this.props.context === "root";
      const errorMessage = this.state.error?.message ?? "An unexpected error occurred";

      if (isRootBoundary) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 text-center border-destructive/40">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
                <AlertTriangle className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                {errorMessage}
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReset} className="w-full">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Try again
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => (window.location.href = "/")}
                  className="w-full"
                >
                  <Home className="h-4 w-4" aria-hidden="true" />
                  Go to dashboard
                </Button>
              </div>
              {process.env.NODE_ENV === "development" && this.state.error?.stack && (
                <details className="mt-6 text-left">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Error details (dev only)
                  </summary>
                  <pre className="mt-2 text-[10px] bg-muted p-3 rounded-md overflow-auto max-h-48">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </Card>
          </div>
        );
      }

      return (
        <Card className="p-6 border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive flex-shrink-0">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-semibold text-foreground mb-1">
                {this.props.context ? `${this.props.context} error` : "Component error"}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                {errorMessage}
              </p>
              <Button size="sm" variant="outline" onClick={this.handleReset}>
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Try again
              </Button>
              {process.env.NODE_ENV === "development" && this.state.error?.stack && (
                <details className="mt-3">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Stack trace (dev only)
                  </summary>
                  <pre className="mt-2 text-[10px] bg-muted p-2 rounded-md overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
