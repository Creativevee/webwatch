import { Component } from 'react'

// Error boundaries have to be class components - React doesn't have a hook for this.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950">
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Something went wrong</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">This page ran into an error.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
