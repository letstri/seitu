import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import * as z from 'zod'

import type { IndexedDbStore } from '../indexed-db'
import { createIndexedDb } from '../indexed-db'
import type { IndexedDbTable } from './index'
import { createIndexedDbTable, IndexedDbTableValidationError } from './index'

const todoSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['open', 'done']),
  order: z.number(),
})
type Todo = z.infer<typeof todoSchema>

function createTodos() {
  return createIndexedDb({
    name: 'app',
    stores: {
      todos: createIndexedDbTable({
        keyPath: 'id',
        indexes: { status: 'status', order: 'order' },
        schema: todoSchema,
      }),
    },
  }).stores.todos
}

const rows: Todo[] = [
  { id: '1', title: 'a', status: 'open', order: 1 },
  { id: '2', title: 'b', status: 'done', order: 2 },
  { id: '3', title: 'c', status: 'open', order: 3 },
]

describe('createIndexedDbTable', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory())
  })

  describe('rows', () => {
    it('puts, gets, and lists rows', async () => {
      const todos = createTodos()
      await todos.put(rows)

      await expect(todos.get('2')).resolves.toEqual(rows[1])
      await expect(todos.get('missing')).resolves.toBeUndefined()
      await expect(todos.getAll()).resolves.toEqual(rows)
      await expect(todos.getAllKeys()).resolves.toEqual(['1', '2', '3'])
      await expect(todos.count()).resolves.toBe(3)
    })

    it('supports key ranges and count limits', async () => {
      const todos = createTodos()
      await todos.put(rows)

      await expect(todos.getAll(IDBKeyRange.bound('1', '2'))).resolves.toEqual(
        rows.slice(0, 2)
      )
      await expect(todos.getAll(null, 1)).resolves.toEqual([rows[0]])
      await expect(todos.count(IDBKeyRange.lowerBound('2'))).resolves.toBe(2)
    })

    it('reads through indexes', async () => {
      const todos = createTodos()
      await todos.put(rows)

      await expect(todos.index('status').getAll('open')).resolves.toEqual([
        rows[0],
        rows[2],
      ])
      await expect(todos.index('status').count('done')).resolves.toBe(1)
      await expect(
        todos.index('order').get(IDBKeyRange.lowerBound(2))
      ).resolves.toEqual(rows[1])
      await expect(
        todos.index('order').getAllKeys(IDBKeyRange.upperBound(2))
      ).resolves.toEqual(['1', '2'])
    })

    it('overwrites on put with the same key', async () => {
      const todos = createTodos()
      await todos.put(rows[0]!)
      await todos.put({ ...rows[0]!, title: 'renamed' })
      await expect(todos.getAll()).resolves.toEqual([
        { ...rows[0], title: 'renamed' },
      ])
    })

    it('deletes one key, many keys, and ranges', async () => {
      const todos = createTodos()
      await todos.put(rows)

      await todos.delete('1')
      await expect(todos.getAllKeys()).resolves.toEqual(['2', '3'])

      await todos.put(rows[0]!)
      await todos.delete(['1', '2'])
      await expect(todos.getAllKeys()).resolves.toEqual(['3'])

      await todos.put(rows)
      await todos.delete(IDBKeyRange.bound('1', '2'))
      await expect(todos.getAllKeys()).resolves.toEqual(['3'])
    })

    it('clears the store', async () => {
      const todos = createTodos()
      await todos.put(rows)
      await todos.clear()
      await expect(todos.count()).resolves.toBe(0)
    })

    it('uses explicit keys for stores without a keyPath', async () => {
      const table = createIndexedDb({
        name: 'app',
        stores: { kv: createIndexedDbTable({ schema: z.number() }) },
      }).stores.kv
      await table.put(1, 'one')
      await table.put(2, 'two')
      await expect(table.get('one')).resolves.toBe(1)
      await expect(table.getAllKeys()).resolves.toEqual(['one', 'two'])
      await expect(table.put([1, 2], 'x')).rejects.toThrow('explicit key')
    })

    it('rejects invalid rows on put without touching the store', async () => {
      const todos = createTodos()
      const error = await todos
        .put([rows[0]!, { id: '9', title: 1 } as unknown as Todo])
        .catch((error: unknown) => error)
      expect(error).toBeInstanceOf(IndexedDbTableValidationError)
      expect(
        (error as IndexedDbTableValidationError).issues.length
      ).toBeGreaterThan(0)
      await expect(todos.count()).resolves.toBe(0)
    })

    it('applies schema transforms on put', async () => {
      const table = createIndexedDb({
        name: 'app',
        stores: {
          items: createIndexedDbTable({
            keyPath: 'id',
            schema: z.object({
              id: z.string(),
              tag: z.string().trim().toLowerCase(),
            }),
          }),
        },
      }).stores.items
      await table.put({ id: '1', tag: '  Hello ' })
      await expect(table.get('1')).resolves.toEqual({
        id: '1',
        tag: 'hello',
      })
    })

    it('drops rows that fail validation on read and lets onValidationError repair them', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const loose = createIndexedDb({
        name: 'app',
        stores: {
          todos: createIndexedDbTable({
            keyPath: 'id',
            schema: z.object({ id: z.string() }).loose(),
          }),
        },
      }).stores.todos
      await loose.put([
        { id: '1', title: 'a', status: 'open', order: 1 },
        { id: '2', title: 2 },
      ])

      const strict = createIndexedDb({
        name: 'app',
        stores: {
          todos: createIndexedDbTable({ keyPath: 'id', schema: todoSchema }),
        },
      }).stores.todos
      await expect(strict.getAll()).resolves.toEqual([rows[0]])
      await expect(strict.get('2')).resolves.toBeUndefined()
      expect(warn).toHaveBeenCalled()

      const repairing = createIndexedDb({
        name: 'app',
        stores: {
          todos: createIndexedDbTable({
            keyPath: 'id',
            schema: todoSchema,
            onValidationError: ({ value }) =>
              ({
                ...(value as object),
                title: 'repaired',
                status: 'open',
                order: 0,
              }) as Todo,
          }),
        },
      }).stores.todos
      await expect(repairing.get('2')).resolves.toEqual({
        id: '2',
        title: 'repaired',
        status: 'open',
        order: 0,
      })
      warn.mockRestore()
    })
  })

  describe('definition', () => {
    it('builds the handle from the definition and types index names', async () => {
      const db = createIndexedDb({
        name: 'app',
        stores: {
          todos: createIndexedDbTable({
            keyPath: 'id',
            indexes: { status: 'status' },
            schema: todoSchema,
          }),
        },
      })
      const { todos } = db.stores
      expect(todos.db).toBe(db)
      expect(todos.storeName).toBe('todos')
      await db.ready

      await todos.put(rows)
      await expect(todos.index('status').getAll('done')).resolves.toEqual([
        rows[1],
      ])
      expectTypeOf(todos.index).parameter(0).toEqualTypeOf<'status'>()
      expectTypeOf(createTodos().index)
        .parameter(0)
        .toEqualTypeOf<'status' | 'order'>()
    })

    it('types index and primary keys from the schema', async () => {
      const todos = createTodos()

      expectTypeOf(todos.index('status').getAll)
        .parameter(0)
        .toEqualTypeOf<'open' | 'done' | IDBKeyRange | null | undefined>()
      expectTypeOf(todos.index('order').get)
        .parameter(0)
        .toEqualTypeOf<number | IDBKeyRange>()
      expectTypeOf(todos.get).parameter(0).toEqualTypeOf<string | IDBKeyRange>()

      // @ts-expect-error - 'open2' is not a status value
      await todos.index('status').getAll('open2')
      // @ts-expect-error - ids are strings
      await todos.get(1)
      // @ts-expect-error - 'missing' is not an index
      todos.index('missing')
    })

    it('rejects key paths that are not in the schema', () => {
      createIndexedDbTable({
        // @ts-expect-error - 'ids' is not a schema key
        keyPath: 'ids',
        schema: todoSchema,
      })

      createIndexedDbTable({
        keyPath: 'id',
        // @ts-expect-error - 'statuss' is not a schema key
        indexes: { status: 'statuss' },
        schema: todoSchema,
      })

      createIndexedDbTable({
        keyPath: ['id', 'order'],
        indexes: {
          status: { keyPath: 'status', unique: false },
          nested: 'title.length',
        },
        schema: todoSchema,
      })
    })

    it('rejects key paths whose field cannot be a key', () => {
      const nested = z.object({
        id: z.string(),
        meta: z.object({ slug: z.string() }),
      })

      createIndexedDbTable({
        // @ts-expect-error - an object field is not a valid key
        keyPath: 'meta',
        schema: nested,
      })

      createIndexedDbTable({ keyPath: 'meta.slug', schema: nested })

      createIndexedDbTable({
        keyPath: 'whatever',
        schema: z.object({ id: z.string() }).loose(),
      })
    })

    it('accepts optional key fields but not nullable ones', () => {
      const schema = z.object({
        id: z.string(),
        slug: z.string().optional(),
        group: z.string().nullable(),
      })

      createIndexedDbTable({ keyPath: 'id', indexes: { slug: 'slug' }, schema })

      createIndexedDbTable({
        keyPath: 'id',
        // @ts-expect-error - null is not a valid key
        indexes: { group: 'group' },
        schema,
      })
    })

    it('allows an explicit put key only without a keyPath', () => {
      type Handle<Store> = Store extends IndexedDbStore<infer H> ? H : never
      type Keyed = Handle<
        ReturnType<
          typeof createIndexedDbTable<typeof todoSchema, { keyPath: 'id' }>
        >
      >
      type OutOfLine = Handle<
        ReturnType<typeof createIndexedDbTable<typeof todoSchema, {}>>
      >

      expectTypeOf<Keyed['put']>().parameter(1).toEqualTypeOf<undefined>()
      expectTypeOf<OutOfLine['put']>()
        .parameter(1)
        .toEqualTypeOf<IDBValidKey | undefined>()
    })

    it('keeps the schema out of the table type', () => {
      type Definition =
        ReturnType<typeof createTodos> extends IndexedDbTable<Todo, infer D>
          ? D
          : never

      expectTypeOf<Definition>().toEqualTypeOf<{
        readonly keyPath: 'id'
        readonly indexes: { readonly status: 'status'; readonly order: 'order' }
      }>()
    })
  })

  describe('query', () => {
    it('starts from initial, resolves ready with the first result, and re-runs after writes', async () => {
      const todos = createTodos()
      await todos.put(rows)

      const open = todos.query((t) => t.index('status').getAll('open'), {
        initial: [],
      })
      expect(open.get()).toEqual([])
      expect(open.getServer()).toEqual([])
      await expect(open.ready).resolves.toEqual([rows[0], rows[2]])
      expect(open.get()).toEqual([rows[0], rows[2]])

      const listener = vi.fn()
      open.subscribe(listener)
      await todos.put({ ...rows[0]!, status: 'done' })
      await vi.waitFor(() => expect(listener).toHaveBeenCalledWith([rows[2]]))
      expect(open.get()).toEqual([rows[2]])
    })

    it('does not notify when the result is deep-equal', async () => {
      const todos = createTodos()
      await todos.put(rows)
      const count = todos.query((t) => t.count(), { initial: 0 })
      await count.ready

      const listener = vi.fn()
      count.subscribe(listener)
      await todos.put({ ...rows[0]!, title: 'same count' })
      await count.refresh()
      expect(listener).not.toHaveBeenCalled()

      await todos.delete('1')
      await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(2))
    })

    it('refreshes on first subscribe to pick up changes made while unsubscribed', async () => {
      const todos = createTodos()
      const all = todos.query((t) => t.getAll(), { initial: [] as Todo[] })
      await all.ready
      expect(all.get()).toEqual([])

      const other = createTodos()
      await other.put(rows[0]!)
      expect(all.get()).toEqual([])

      const listener = vi.fn()
      all.subscribe(listener)
      await vi.waitFor(() => expect(listener).toHaveBeenCalledWith([rows[0]]))
    })

    it('types the result as R | undefined without initial', async () => {
      const todos = createTodos()
      const first = todos.query((t) => t.get('1'))
      expectTypeOf(first.get()).toEqualTypeOf<Todo | undefined>()
      expect(first.get()).toBeUndefined()
      await first.ready
    })

    it('keeps the cached value and warns when the query throws', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const todos = createTodos()
      const failing = todos.query(() => Promise.reject(new Error('nope')), {
        initial: 'initial',
      })
      await expect(failing.ready).resolves.toBe('initial')
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Query failed'),
        expect.any(Error)
      )
      warn.mockRestore()
    })

    it('lets the latest run win when runs overlap', async () => {
      const todos = createTodos()
      let resolveSlow!: (value: string) => void
      let calls = 0
      const query = todos.query(
        () => {
          calls++
          if (calls === 1) {
            return new Promise<string>((resolve) => {
              resolveSlow = resolve
            })
          }
          return Promise.resolve('fast')
        },
        { initial: 'initial' }
      )

      const slow = query.ready
      await expect(query.refresh()).resolves.toBe('fast')
      resolveSlow('slow')
      await expect(slow).resolves.toBe('fast')
      expect(query.get()).toBe('fast')
    })
  })

  describe('cross-tab', () => {
    it('notifies subscribers when another handle of the same store writes', async () => {
      const a = createTodos()
      const b = createTodos()
      const query = a.query((t) => t.getAll(), { initial: [] as Todo[] })
      await query.ready

      const listener = vi.fn()
      query.subscribe(listener)
      await b.put(rows[0]!)
      await vi.waitFor(() => expect(listener).toHaveBeenCalledWith([rows[0]]))
    })
  })

  describe('ssr', () => {
    it('rejects reads and keeps queries on initial when IndexedDB is unavailable', async () => {
      vi.stubGlobal('indexedDB', undefined)
      const todos = createTodos()
      await expect(todos.getAll()).rejects.toThrow('IndexedDB is not available')

      const all = todos.query((t) => t.getAll(), { initial: [] as Todo[] })
      await expect(all.ready).resolves.toEqual([])
      expect(all.get()).toEqual([])
    })
  })
})
