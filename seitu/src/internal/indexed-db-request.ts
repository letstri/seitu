export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export function createBroadcaster(channelName: string): {
  broadcast: () => void
  listen: (onMessage: () => void) => (() => void) | undefined
} {
  let channel: BroadcastChannel | undefined

  return {
    broadcast: () => {
      if (typeof BroadcastChannel === 'undefined') {
        return
      }

      if (channel) {
        channel.postMessage(null)
        return
      }

      const ephemeral = new BroadcastChannel(channelName)
      ephemeral.postMessage(null)
      ephemeral.close()
    },
    listen: (onMessage) => {
      if (typeof BroadcastChannel === 'undefined') {
        return
      }

      channel = new BroadcastChannel(channelName)
      channel.onmessage = onMessage

      return () => {
        channel?.close()
        channel = undefined
      }
    },
  }
}
