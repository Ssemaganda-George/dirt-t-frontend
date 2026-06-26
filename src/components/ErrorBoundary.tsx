import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error?: Error; isChunkError?: boolean }

const CHUNK_RELOAD_KEY = 'dt_chunk_reload'

function isChunkLoadError(error: Error) {
  return (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed') ||
    error.name === 'ChunkLoadError'
  )
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isChunkError: isChunkLoadError(error) }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info)

    if (isChunkLoadError(error)) {
      // Auto-reload once on stale chunk after a new deploy. The session flag
      // prevents an infinite reload loop if the new chunks also fail to load.
      if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
        window.location.reload()
      } else {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY)
      }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    // Chunk errors: show a brief "reloading" state while the reload fires.
    if (this.state.isChunkError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Updating…</h2>
            <p className="text-sm text-gray-600">A newer version is available. Reloading automatically.</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-600 mb-4">A page failed to load. Try refreshing, or check the dev server console for details.</p>
          <pre className="text-xs text-left bg-gray-50 p-2 rounded overflow-auto text-red-600">{String(this.state.error?.message || '')}</pre>
          <div className="mt-4">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-emerald-700 text-white rounded">Reload</button>
          </div>
        </div>
      </div>
    )
  }
}
