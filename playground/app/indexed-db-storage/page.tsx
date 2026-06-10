'use client'

import * as React from 'react'
import { createComputed } from 'seitu'
import { Subscription, useSubscription } from 'seitu/react'
import { createIndexedDbStorage } from 'seitu/web'
import * as z from 'zod'

const indexedDbStorage = createIndexedDbStorage({
  databaseName: 'playground',
  schemas: {
    firstName: z.string(),
    lastName: z.string(),
  },
  defaultValues: {
    firstName: 'John',
    lastName: 'Doe',
  },
})

const fullName = createComputed(indexedDbStorage, s => `${s.firstName} ${s.lastName}`)

export default function Page() {
  const [hydrated, setHydrated] = React.useState(false)
  const firstName = useSubscription(indexedDbStorage, { selector: s => s.firstName })
  const name = useSubscription(fullName)

  React.useEffect(() => {
    void indexedDbStorage.ready.then(() => setHydrated(true))
  }, [])

  return (
    <>
      <p>
        {hydrated ? 'Hydrated from IndexedDB' : 'Loading from IndexedDB…'}
      </p>
      <input
        type="text"
        value={firstName}
        onChange={e => void indexedDbStorage.set({ firstName: e.target.value })}
      />
      <Subscription value={indexedDbStorage} selector={s => s.lastName}>
        {lastName => (
          <input
            type="text"
            value={lastName}
            onChange={e => void indexedDbStorage.set({ lastName: e.target.value })}
          />
        )}
      </Subscription>
      <span>{name}</span>
      <button type="button" onClick={() => void indexedDbStorage.clear()}>
        Reset
      </button>
    </>
  )
}
