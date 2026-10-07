'use client'

import { createComputed } from 'seitu'
import { Subscription, useSubscription } from 'seitu/react'
import { createWebStorage } from 'seitu/web'
import * as z from 'zod'

const localStorage = createWebStorage({
  type: 'localStorage',
  schemas: {
    firstName: z.string(),
    lastName: z.string(),
  },
  defaultValues: {
    firstName: 'John',
    lastName: 'Doe',
  },
})

const fullName = createComputed(
  localStorage,
  (s) => `${s.firstName} ${s.lastName}`
)

// Module-scope selectors keep `useSubscription`'s snapshot cache warm.
type Profile = ReturnType<typeof localStorage.get>
const selectFirstName = (s: Profile) => s.firstName
const selectLastName = (s: Profile) => s.lastName

export default function Page() {
  const firstName = useSubscription(localStorage, {
    selector: selectFirstName,
  })
  const name = useSubscription(fullName)

  return (
    <>
      <input
        type="text"
        value={firstName}
        onChange={(e) => localStorage.set({ firstName: e.target.value })}
      />
      <Subscription value={localStorage} selector={selectLastName}>
        {(lastName) => (
          <input
            type="text"
            value={lastName}
            onChange={(e) => localStorage.set({ lastName: e.target.value })}
          />
        )}
      </Subscription>
      <span>{name}</span>
    </>
  )
}
