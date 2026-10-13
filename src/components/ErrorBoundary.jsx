import { Component } from 'react';
export default class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="page-loading">
        <h1>Something interrupted this view.</h1>
        <p>Your project is saved on the server.</p>
        <button className="primary-button" onClick={() => location.reload()}>
          Reload workspace
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
