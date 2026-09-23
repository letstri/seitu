import type { StandardSchemaV1 } from '@standard-schema/spec'

import type {
  Clearable,
  ServerReadable,
  Subscribable,
  Writable,
} from '../../core'
import { createReadableSubscription, createSubscription } from '../../core'
import {
  broadcastCookieChange,
  listenCookie,
} from '../../internal/cookie-event'
import type { ValidationSchemaErrorProps } from '../../internal/validate'
import { validateSchema } from '../../internal/validate'
import type { CookieAttributes } from '../../utils/cookie'
import { parseCookie, serializeCookie } from '../../utils/cookie'
import { tryParseJson } from '../../utils/json'
import { repairValueObjectWithDefault } from '../../utils/validation'

export interface CookieValue<V>
  extends Subscribable<V>, ServerReadable<V>, Writable<V>, Clearable {}

export interface CookieValueOptions<S extends StandardSchemaV1<unknown>> {
  key: string
  schema: S
  defaultValue: StandardSchemaV1.InferOutput<S>
  /** Return a repaired value, or nothing to fall back to `defaultValue`. */
  onValidationError?: (
    props: ValidationSchemaErrorProps<StandardSchemaV1.InferOutput<S>>
  ) => void | StandardSchemaV1.InferOutput<S>
  /**
   * The request's `Cookie` header, called on every server read. Seitu cannot
   * know the framework, so the app passes its own reader.
   */
  getServerCookies?: () => string | null | undefined
  /**
   * Written with every `set`.
   * Defaults: path '/', sameSite 'lax', maxAge 400 days (the browser cap).
   */
  attributes?: CookieAttributes
}

// Browsers drop a cookie whose `name=value` pair is bigger than this.
const MAX_COOKIE_BYTES = 4096

const decode = (raw: string) => {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/**
 * Reactive handle for one cookie. The cookie is the storage, so the server
 * and the browser read the same value: pass `getServerCookies` and SSR renders
 * the visitor's choice, and hydration matches it.
 *
 * `set` writes `document.cookie` and is a no-op on the server; sending a
 * `Set-Cookie` response header is the framework's job. Keep values small: the
 * encoded `name=value` pair must stay under 4 KB (bigger writes are skipped
 * with a warning) and cookies travel with every request. `HttpOnly` cookies
 * are invisible to JavaScript, so they cannot be read or written here.
 *
 * @example Vanilla
 * ```ts twoslash title="theme.ts"
 * import { createCookieValue } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const theme = createCookieValue({
 *   key: 'theme',
 *   schema: z.enum(['light', 'dark']),
 *   defaultValue: 'light',
 * })
 *
 * theme.get()
 * theme.set('dark')
 * theme.subscribe(console.log)
 * theme.clear()
 * ```
 *
 * @example TanStack Start
 * ```ts title="theme.ts"
 * import { createIsomorphicFn } from '@tanstack/react-start'
 * import { getRequestHeader } from '@tanstack/react-start/server'
 * import { createCookieValue } from 'seitu/web'
 * import * as z from 'zod'
 *
 * export const theme = createCookieValue({
 *   key: 'theme',
 *   schema: z.enum(['light', 'dark']),
 *   defaultValue: 'light',
 *   getServerCookies: createIsomorphicFn().server(() =>
 *     getRequestHeader('cookie')
 *   ),
 * })
 * ```
 *
 * @example Next.js
 * ```ts title="theme.ts"
 * import { cookies } from 'next/headers'
 * import { createCookieValue } from 'seitu/web'
 * import * as z from 'zod'
 *
 * export const theme = createCookieValue({
 *   key: 'theme',
 *   schema: z.enum(['light', 'dark']),
 *   defaultValue: 'light',
 *   getServerCookies: () =>
 *     cookies()
 *       .getAll()
 *       .map(({ name, value }) => `${name}=${value}`)
 *       .join('; '),
 * })
 * ```
 *
 * @example React
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import { createCookieValue } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const theme = createCookieValue({
 *   key: 'theme',
 *   schema: z.enum(['light', 'dark']),
 *   defaultValue: 'light',
 * })
 *
 * export default function Page() {
 *   const value = useSubscription(theme)
 *   return (
 *     <button onClick={() => theme.set(value === 'dark' ? 'light' : 'dark')}>
 *       {value}
 *     </button>
 *   )
 * }
 * ```
 */
export function createCookieValue<S extends StandardSchemaV1<unknown>>(
  options: CookieValueOptions<S>
): CookieValue<StandardSchemaV1.InferOutput<S>>
export function createCookieValue(
  options: CookieValueOptions<StandardSchemaV1<unknown>>
): CookieValue<unknown> {
  const { schema, key, attributes } = options
  const defaultValue = options.defaultValue ?? null
  const isDefaultValueObject =
    typeof defaultValue === 'object' && defaultValue !== null
  const label = `createCookieValue:${key}`

  const readRaw = () => {
    const header =
      typeof window === 'undefined'
        ? options.getServerCookies?.()
        : document.cookie

    return header ? parseCookie(header, key) : null
  }

  let cachedRaw: string | null | undefined
  let cachedValue: unknown

  const { subscribe, notify } = createSubscription({
    // `set` notifies synchronously; the change event that follows it (this
    // tab is a listener too) is skipped because the raw value is already cached.
    onFirstSubscribe: () =>
      listenCookie(key, () => {
        if (readRaw() !== cachedRaw) {
          notify()
        }
      }),
  })

  const get = () => {
    const raw = readRaw()

    if (cachedRaw !== undefined && raw === cachedRaw) {
      return cachedValue
    }

    cachedRaw = raw

    if (raw === null) {
      cachedValue = defaultValue
      return cachedValue
    }

    const parsed = tryParseJson(decode(raw))

    try {
      cachedValue = validateSchema(schema, parsed, {
        defaultValue,
        label,
        key,
        onError: (props) => {
          const toReturn = options.onValidationError?.(props)

          return toReturn === undefined && isDefaultValueObject
            ? repairValueObjectWithDefault(props as never)
            : toReturn
        },
      })
    } catch (error) {
      console.warn(
        `[${label}] Validation failed, returned default value instead`,
        error
      )
      cachedValue = defaultValue
    }

    return cachedValue
  }

  const readable = createReadableSubscription(get, subscribe, notify, get)

  const write = (newRaw: string | null) => {
    if (typeof window === 'undefined') {
      return
    }

    const oldRaw = readRaw()

    if (newRaw === null) {
      // Both: `Max-Age` wins where supported, `Expires` covers the rest.
      document.cookie = serializeCookie(key, '', {
        ...attributes,
        maxAge: 0,
        expires: new Date(0),
      })
    } else {
      if (
        new TextEncoder().encode(`${key}=${newRaw}`).length > MAX_COOKIE_BYTES
      ) {
        console.warn(`[${label}] Cookie is over 4096 bytes, write skipped`)
        return
      }

      document.cookie = serializeCookie(key, newRaw, attributes)
    }

    cachedRaw = undefined

    if (oldRaw !== newRaw) {
      notify()
      broadcastCookieChange(key)
    }
  }

  return {
    ...readable,
    set: (value) =>
      write(
        encodeURIComponent(
          JSON.stringify(typeof value === 'function' ? value(get()) : value)
        )
      ),
    clear: () => write(null),
  }
}
