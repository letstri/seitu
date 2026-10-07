export interface CookieAttributes {
  path?: string
  domain?: string
  maxAge?: number
  expires?: Date
  sameSite?: 'strict' | 'lax' | 'none'
  secure?: boolean
  partitioned?: boolean
}

/** 400 days, the cap browsers apply to `Max-Age`/`Expires`. */
const DEFAULT_MAX_AGE = 400 * 24 * 60 * 60

/** Same set `String.prototype.trim` strips. */
const WHITESPACE = /\s/

/**
 * Returns the raw value of `key` from a `Cookie` header or `document.cookie`,
 * or `null` when the cookie is missing.
 *
 * @example
 * ```ts twoslash
 * import { parseCookie } from 'seitu/utils'
 *
 * parseCookie('a=1; theme=dark', 'theme') // 'dark'
 * parseCookie('a=1', 'theme') // null
 * ```
 */
export function parseCookie(header: string, key: string): string | null {
  const prefix = `${key}=`

  // Jump between occurrences of `key=` and accept the first one that starts a
  // pair (only whitespace between it and the previous `;`), instead of
  // splitting and trimming every cookie in the header.
  for (
    let index = header.indexOf(prefix);
    index !== -1;
    index = header.indexOf(prefix, index + 1)
  ) {
    let before = index - 1
    while (before >= 0 && WHITESPACE.test(header[before]!)) {
      before--
    }

    if (before === -1 || header[before] === ';') {
      const start = index + prefix.length
      const end = header.indexOf(';', start)
      return header.slice(start, end === -1 ? undefined : end).trimEnd()
    }
  }

  return null
}

/**
 * Builds a `document.cookie`/`Set-Cookie` string. Defaults: `Path=/`,
 * `SameSite=Lax`, `Max-Age` of 400 days unless `expires` is set.
 *
 * @example
 * ```ts twoslash
 * import { serializeCookie } from 'seitu/utils'
 *
 * serializeCookie('theme', 'dark', { maxAge: 60 })
 * // 'theme=dark; Path=/; Max-Age=60; SameSite=Lax'
 * ```
 */
export function serializeCookie(
  key: string,
  raw: string,
  attributes: CookieAttributes = {}
): string {
  const {
    path = '/',
    domain,
    expires,
    maxAge = expires ? undefined : DEFAULT_MAX_AGE,
    sameSite = 'lax',
    secure,
    partitioned,
  } = attributes

  const parts = [`${key}=${raw}`, `Path=${path}`]

  if (domain) {
    parts.push(`Domain=${domain}`)
  }
  if (maxAge !== undefined) {
    parts.push(`Max-Age=${maxAge}`)
  }
  if (expires) {
    parts.push(`Expires=${expires.toUTCString()}`)
  }
  parts.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`)
  if (secure) {
    parts.push('Secure')
  }
  if (partitioned) {
    parts.push('Partitioned')
  }

  return parts.join('; ')
}
