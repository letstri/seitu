import type { Readable, Subscribable } from '../subscription'
import { createReadableSubscription, createSubscription } from '../subscription'

export interface Computed<T> extends Readable<T>, Subscribable<T> {}

const UNSET = Symbol('seitu.unset')

type Source<T = unknown> = Readable<T> & Subscribable<T>
type SourceValues<S extends readonly Source[]> = {
  [K in keyof S]: S[K] extends Source<infer V> ? V : never
}

/**
 * Derives a subscription from one source or many. `transform` is memoized on
 * source references, so `get()` is stable until a source changes. Subscribers
 * are notified only when the derived value changes (`Object.is`).
 *
 * @example
 * ```ts twoslash
 * import { createComputed, createStore } from 'seitu'
 *
 * const count = createStore({ a: 1, b: 2 })
 * const sum = createComputed(count, s => s.a + s.b)
 * sum.get() // 3
 * ```
 *
 * @example
 * ```ts twoslash
 * import { createComputed, createStore } from 'seitu'
 *
 * const a = createStore(1)
 * const b = createStore(2)
 * const sum = createComputed([a, b], ([a, b]) => a + b)
 * sum.get()
 * ```
 */
export function createComputed<S extends readonly Source[], R>(
  sources: [...S],
  transform: (values: SourceValues<S>) => R
): Computed<R>
export function createComputed<T, R>(
  source: Source<T>,
  transform: (value: T) => R
): Computed<R>
export function createComputed(
  source: Source | Source[],
  transform: (value: any) => any
): Computed<any> {
  const sources = Array.isArray(source) ? source : [source]
  const isSingle = !Array.isArray(source)

  const evaluate = (values: unknown[]) =>
    transform(isSingle ? values[0] : values)

  let lastInputs: unknown[] | undefined
  let lastOutput: unknown

  const get = () => {
    // Allocate a new inputs array only once a source has changed.
    let inputs: unknown[] | undefined

    for (let i = 0; i < sources.length; i++) {
      const value = sources[i]!.get()

      if (inputs) {
        inputs[i] = value
      } else if (!lastInputs || value !== lastInputs[i]) {
        inputs = lastInputs ? lastInputs.slice(0, i) : []
        inputs[i] = value
      }
    }

    if (inputs) {
      lastOutput = evaluate(inputs)
      lastInputs = inputs
    }

    return lastOutput
  }

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe() {
      let current: unknown = UNSET
      try {
        current = get()
      } catch {
        // A throwing transform surfaces on the next read, not on subscribe.
      }
      // Skip the notify when a source change leaves the derived value as is.
      const onSourceChange = () => {
        const next = get()

        if (!Object.is(next, current)) {
          current = next
          notify()
        }
      }
      const unsubscribes = sources.map((s) => s.subscribe(onSourceChange))
      return () => unsubscribes.forEach((u) => u())
    },
  })

  const getServer = sources.every((s) => s.getServer)
    ? () => evaluate(sources.map((s) => s.getServer!()))
    : undefined

  return createReadableSubscription(get, subscribe, notify, getServer)
}
