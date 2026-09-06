export function dispatchStorageEvent(
  storageArea: Storage,
  key: string,
  oldValue: string | null,
  newValue: string | null
): void {
  if (oldValue === newValue) {
    return
  }

  window.dispatchEvent(
    new StorageEvent('storage', {
      key,
      oldValue,
      newValue,
      storageArea,
      url: window.location.href,
    })
  )
}

/** Attaches a `storage` listener; returns undefined on the server. */
export function listenStorage(
  shouldNotify: (event: StorageEvent) => boolean,
  notify: () => void
): (() => void) | undefined {
  if (typeof window === 'undefined') {
    return
  }

  const listener = (event: StorageEvent) => {
    if (shouldNotify(event)) {
      notify()
    }
  }

  window.addEventListener('storage', listener)

  return () => window.removeEventListener('storage', listener)
}
