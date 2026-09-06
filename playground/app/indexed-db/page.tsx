'use client'

import * as React from 'react'
import { createComputed } from 'seitu'
import { Subscription, useSubscription } from 'seitu/react'
import { createIndexedDb } from 'seitu/web/indexed-db'
import { createIndexedDbStorage } from 'seitu/web/indexed-db-storage'
import { createIndexedDbTable } from 'seitu/web/indexed-db-table'
import * as z from 'zod'

const db = createIndexedDb({
  name: 'playground',
  stores: {
    profile: createIndexedDbStorage({
      schemas: {
        firstName: z.string(),
        lastName: z.string(),
      },
      defaultValues: {
        firstName: 'John',
        lastName: 'Doe',
      },
    }),
    settings: createIndexedDbStorage({
      schemas: { filter: z.enum(['all', 'open', 'done']) },
      defaultValues: { filter: 'all' },
    }),
    todos: createIndexedDbTable({
      keyPath: 'id',
      indexes: { status: 'status', createdAt: 'createdAt' },
      schema: z.object({
        id: z.string(),
        title: z.string().min(1),
        status: z.enum(['open', 'done']),
        createdAt: z.number(),
      }),
    }),
  },
})

const { profile, settings, todos } = db.stores

const fullName = createComputed(profile, (s) => `${s.firstName} ${s.lastName}`)

const allTodos = todos.query((t) => t.index('createdAt').getAll(), {
  initial: [],
})
const openTodos = todos.query((t) => t.index('status').getAll('open'), {
  initial: [],
})
const doneTodos = todos.query((t) => t.index('status').getAll('done'), {
  initial: [],
})

const queries = { all: allTodos, open: openTodos, done: doneTodos }

export default function Page() {
  const [hydrated, setHydrated] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const firstName = useSubscription(profile, { selector: (s) => s.firstName })
  const name = useSubscription(fullName)
  const filter = useSubscription(settings, { selector: (s) => s.filter })
  const rows = useSubscription(queries[filter])
  const open = useSubscription(() =>
    todos.query((t) => t.index('status').count('open'), {
      initial: 0,
    })
  )

  React.useEffect(() => {
    void db.ready.then(() => setHydrated(true))
  }, [])

  const add = async () => {
    setError(null)
    try {
      await todos.put({
        id: crypto.randomUUID(),
        title,
        status: 'open',
        createdAt: Date.now(),
      })
      setTitle('')
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <>
      <p>{hydrated ? 'Hydrated from IndexedDB' : 'Loading from IndexedDB…'}</p>

      <h2>Storage</h2>
      <input
        type="text"
        value={firstName}
        onChange={(e) => void profile.set({ firstName: e.target.value })}
      />
      <Subscription value={profile} selector={(s) => s.lastName}>
        {(lastName) => (
          <input
            type="text"
            value={lastName}
            onChange={(e) => void profile.set({ lastName: e.target.value })}
          />
        )}
      </Subscription>
      <span>{name}</span>
      <button type="button" onClick={() => void profile.clear()}>
        Reset
      </button>

      <h2>Table</h2>
      <p>{open} open</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void add()
        }}
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New todo"
        />
        <button type="submit">Add</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p>
        {(['all', 'open', 'done'] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              checked={filter === value}
              onChange={() => void settings.set({ filter: value })}
            />
            {value}
          </label>
        ))}
      </p>
      <ul>
        {rows.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.status === 'done'}
              onChange={() =>
                void todos.put({
                  ...todo,
                  status: todo.status === 'done' ? 'open' : 'done',
                })
              }
            />
            {todo.title}
            <button type="button" onClick={() => void todos.delete(todo.id)}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => void todos.clear()}>
        Clear all
      </button>
    </>
  )
}
