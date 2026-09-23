const CHANNEL_NAME = 'seitu:cookie'

const hasCookieStore = () => typeof cookieStore !== 'undefined'

/** Tells other tabs about a write when the browser has no `cookieStore`. */
export function broadcastCookieChange(key: string): void {
  if (hasCookieStore() || typeof BroadcastChannel === 'undefined') {
    return
  }

  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.postMessage({ key })
  channel.close()
}

/**
 * Notifies on cookie changes from other tabs: `cookieStore` when available,
 * otherwise a `BroadcastChannel` fed by `broadcastCookieChange`.
 * Returns undefined on the server.
 */
export function listenCookie(
  key: string,
  notify: () => void
): (() => void) | undefined {
  if (typeof window === 'undefined') {
    return
  }

  if (hasCookieStore()) {
    const listener = (event: CookieChangeEvent) => {
      if (
        [...event.changed, ...event.deleted].some((item) => item.name === key)
      ) {
        notify()
      }
    }

    cookieStore.addEventListener('change', listener)

    return () => cookieStore.removeEventListener('change', listener)
  }

  if (typeof BroadcastChannel === 'undefined') {
    return
  }

  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent<{ key: string }>) => {
    if (event.data.key === key) {
      notify()
    }
  }

  return () => channel.close()
}
