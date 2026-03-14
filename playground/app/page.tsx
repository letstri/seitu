'use client'

import { createComputed } from 'seitu'
import { Subscription, useSubscription } from 'seitu/react'
import { createLocalStorage } from 'seitu/web'
import * as z from 'zod'

const localStorage = createLocalStorage({
  schemas: {
    firstName: z.string(),
    lastName: z.string(),
  },
  defaultValues: {
    firstName: 'John',
    lastName: 'Doe',
  },
})

const fullName = createComputed(localStorage, s => `${s.firstName} ${s.lastName}`)

export default function Page() {
  const firstName = useSubscription(localStorage, { selector: s => s.firstName })
  const name = useSubscription(fullName)

  return (
    <>
      <input
        type="text"
        value={firstName}
        onChange={e => localStorage.set({ firstName: e.target.value })}
      />
      <Subscription value={localStorage} selector={s => s.lastName}>
        {lastName => (
          <input
            type="text"
            value={lastName}
            onChange={e => localStorage.set({ lastName: e.target.value })}
          />
        )}
      </Subscription>
      <span>{name}</span>
    </>
  )
}
