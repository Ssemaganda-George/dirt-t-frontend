import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error?: Error }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    // You can log the error to an external service here
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 mb-4">A page failed to load. Try refreshing, or check the dev server console for details.</p>
            <pre className="text-xs text-left bg-gray-50 p-2 rounded overflow-auto text-red-600">{String(this.state.error?.message || '')}</pre>
            <div className="mt-4">
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded">Reload</button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
