import { describe, expect, it } from 'vitest'

import { parseCookie, serializeCookie } from './index'

describe('parseCookie', () => {
  it('returns the first matching value', () => {
    expect(parseCookie('a=1; theme=dark; theme=light', 'theme')).toBe('dark')
  })

  it('does not match a key prefix', () => {
    expect(parseCookie('theme2=x; theme=y', 'theme')).toBe('y')
    expect(parseCookie('theme2=x', 'theme')).toBeNull()
  })

  it('returns null when missing', () => {
    expect(parseCookie('', 'theme')).toBeNull()
  })

  it('trims whitespace around pairs like split + trim', () => {
    expect(parseCookie('a=1;theme=dark', 'theme')).toBe('dark')
    expect(parseCookie('a=1;\t theme=dark  ; b=2', 'theme')).toBe('dark')
    expect(parseCookie('theme=', 'theme')).toBe('')
    expect(parseCookie('', 'theme')).toBeNull()
    expect(parseCookie('a=1;', 'theme')).toBeNull()
    expect(parseCookie('theme= dark ', 'theme')).toBe(' dark')
  })

  it('ignores the key inside another cookie value', () => {
    expect(parseCookie('a=theme=x; theme=y', 'theme')).toBe('y')
    expect(parseCookie('a=x theme=1', 'theme')).toBeNull()
  })
})

describe('serializeCookie', () => {
  it('applies defaults', () => {
    expect(serializeCookie('k', 'v')).toBe(
      'k=v; Path=/; Max-Age=34560000; SameSite=Lax'
    )
  })

  it('serializes every attribute', () => {
    const expires = new Date('2030-01-01T00:00:00Z')
    expect(
      serializeCookie('k', 'v', {
        path: '/app',
        domain: 'example.com',
        maxAge: 60,
        expires,
        sameSite: 'none',
        secure: true,
        partitioned: true,
      })
    ).toBe(
      `k=v; Path=/app; Domain=example.com; Max-Age=60; Expires=${expires.toUTCString()}; SameSite=None; Secure; Partitioned`
    )
  })

  it('drops the default Max-Age when expires is set', () => {
    const expires = new Date('2030-01-01T00:00:00Z')
    expect(serializeCookie('k', 'v', { expires })).toBe(
      `k=v; Path=/; Expires=${expires.toUTCString()}; SameSite=Lax`
    )
  })
})
