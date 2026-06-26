/** One-shot full reload when a lazy route chunk 404s after a new deploy. */
export const CHUNK_RELOAD_KEY = 'dt_chunk_reload'

export function isChunkLoadError(reason: unknown): boolean {
  const msg = reason instanceof Error ? reason.message : String(reason ?? '')
  const name = reason instanceof Error ? reason.name : ''
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    name === 'ChunkLoadError'
  )
}

/** Clear guard after a successful boot (post-reload). */
export function clearChunkReloadGuard() {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  } catch {
    // ignore private mode / blocked storage
  }
}

/** Reload once; on repeat failure leave guard cleared so UI can show manual reload. */
export function reloadForStaleChunk() {
  try {
    if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
      window.location.reload()
      return true
    }
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  } catch {
    window.location.reload()
    return true
  }
  return false
}

export function registerChunkRecoveryHandlers() {
  clearChunkReloadGuard()

  // Vite fires this when a preloaded/lazy chunk hash no longer exists on the server.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    reloadForStaleChunk()
  })

  // Lazy() rejections and some browsers surface chunk 404s here instead.
  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) return
    event.preventDefault()
    if (reloadForStaleChunk()) return
  })
}
