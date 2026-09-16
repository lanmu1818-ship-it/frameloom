// Modified for standalone community distribution; see NOTICE.
"use client";

import React from "react";

interface ClientErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  resetKeys?: unknown[];
}

interface ClientErrorBoundaryState {
  hasError: boolean;
}

function areResetKeysEqual(nextKeys?: unknown[], prevKeys?: unknown[]) {
  if (nextKeys === prevKeys) {
    return true;
  }
  if (!nextKeys || !prevKeys) {
    return false;
  }
  if (nextKeys.length !== prevKeys.length) {
    return false;
  }

  return nextKeys.every((key, index) => Object.is(key, prevKeys[index]));
}

export class ClientErrorBoundary extends React.Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  constructor(props: ClientErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: ClientErrorBoundaryProps) {
    if (
      this.state.hasError &&
      !areResetKeysEqual(this.props.resetKeys, prevProps.resetKeys)
    ) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ClientErrorBoundary] Caught client error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
