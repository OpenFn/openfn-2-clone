import { Component, type ErrorInfo, type ReactNode } from "react";
import ErrorPage from "./ErrorPage";

interface Props {
  /** Changes when the route does; a crash on one page clears on the next. */
  resetKey: string;
  children: ReactNode;
}

/**
 * Catches a page that crashes while drawing and shows ErrorPage in its place,
 * keeping the shell around it. A failed load or save never gets here: those
 * reach the page as `status` or a rejected `on*` promise.
 */
export default class RouteErrorBoundary extends Component<Props, { error: Error | null; resetKey: string }> {
  override state = { error: null as Error | null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  static getDerivedStateFromProps(props: Props, state: { error: Error | null; resetKey: string }) {
    return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // ponytail: reports to the console only; send it to an error service (Sentry, as Lightning does) once there is one.
    console.error("A page crashed", error, info.componentStack);
  }

  override render() {
    if (this.state.error) return <ErrorPage message={this.state.error.message} onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}
