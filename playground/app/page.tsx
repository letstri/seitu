'use client'

import { useRef } from 'react'
import { useSubscription } from 'seitu/react'
import { createLocalStorage } from 'seitu/web'
import * as z from 'zod'

const localStorage = createLocalStorage({
  schemas: {
    count: z.number(),
  },
  defaultValues: {
    count: 0,
  },
})

function CountRender() {
  const renderCount = useRef(1).current++
  const count = useSubscription(localStorage, { selector: value => value.count })
  return (
    <>
      <p>
        Count:
        {count}
      </p>
      <p style={{ opacity: 0.5 }}>
        Render count:
        {renderCount}
      </p>
    </>
  )
}

function CountMod10() {
  const renderCount = useRef(1).current++
  const mod10 = useSubscription(localStorage, { selector: value => value.count % 10 === 0 })
  return (
    <>
      <p>
        Mod 10:
        {mod10 ? 'Yes' : 'No'}
      </p>
      <p style={{ opacity: 0.5 }}>
        Render count:
        {renderCount}
      </p>
    </>
  )
}

export default function Home() {
  return (
    <div>
      <button onClick={() => localStorage.set(({ count }) => ({ count: count + 1 }))}>Increment</button>
      <CountRender />
      <CountMod10 />
    </div>
  )
}
