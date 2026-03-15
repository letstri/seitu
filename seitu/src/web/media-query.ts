import type { Readable, Subscribable } from '../core/index'
import { createSubscription } from '../core/index'

export interface MediaQuery extends Subscribable<boolean>, Readable<boolean> {}

type MinMaxPrefix = 'min-' | 'max-' | ''
type CSSUnitSuffix = 'px' | 'em' | 'rem' | 'vw' | 'vh' | 'dvw' | 'dvh' | 'svw' | 'svh' | 'lvw' | 'lvh' | 'cqw' | 'cqh' | 'vmin' | 'vmax' | 'cm' | 'mm' | 'in' | 'pt' | 'pc'
type CSSUnit = `${number}${CSSUnitSuffix}`
type CSSResolution = `${number}${'dpi' | 'dpcm' | 'dppx' | 'x'}`
type Ratio = `${number}/${number}`

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
type ParseNum<S extends string, Acc extends string = ''>
  = S extends `${infer D extends Digit | '.'}${infer Rest}`
    ? ParseNum<Rest, `${Acc}${D}`>
    : Acc extends `${infer N extends number}` ? N : false

type MQEnum<F extends string, V extends string> = `(${F}: ${V})`
type MQRange<F extends string, V extends string = CSSUnit> = `(${MinMaxPrefix}${F}: ${V})`
type MQOptNum<F extends string> = `(${MinMaxPrefix}${F}${'' | `: ${number}`})`

export type MediaQueryType
  = | `${'only ' | 'not ' | ''}${'screen' | 'print' | 'all'}`
    | MQEnum<'any-hover' | 'hover', 'hover' | 'none'>
    | MQEnum<'any-pointer' | 'pointer', 'none' | 'coarse' | 'fine'>
    | MQRange<'width' | 'height' | 'device-width' | 'device-height' | 'inline-size' | 'block-size'>
    | MQRange<'aspect-ratio' | 'device-aspect-ratio', Ratio>
    | MQOptNum<'color' | 'color-index' | 'monochrome'>
    | MQEnum<'color-gamut', 'srgb' | 'p3' | 'rec2020'>
    | MQEnum<'dynamic-range' | 'video-dynamic-range', 'standard' | 'high'>
    | MQEnum<'device-posture', 'continuous' | 'folded'>
    | MQEnum<'display-mode', 'browser' | 'fullscreen' | 'minimal-ui' | 'picture-in-picture' | 'standalone' | 'window-controls-overlay'>
    | MQEnum<'orientation', 'portrait' | 'landscape'>
    | MQEnum<'scan', 'interlace' | 'progressive'>
    | MQEnum<'grid', '0' | '1'>
    | MQEnum<'update', 'none' | 'slow' | 'fast'>
    | MQEnum<'overflow-block', 'none' | 'scroll' | 'optional-paged' | 'paged'>
    | MQEnum<'overflow-inline', 'none' | 'scroll'>
    | MQEnum<'environment-blending', 'opaque' | 'additive' | 'subtractive'>
    | MQRange<'resolution', 'infinite' | CSSResolution>
    | MQEnum<'prefers-color-scheme', 'light' | 'dark'>
    | MQEnum<'prefers-contrast', 'no-preference' | 'more' | 'less' | 'forced'>
    | MQEnum<'prefers-reduced-motion' | 'prefers-reduced-transparency' | 'prefers-reduced-data', 'no-preference' | 'reduce'>
    | MQEnum<'forced-colors', 'none' | 'active'>
    | MQEnum<'inverted-colors', 'none' | 'inverted'>
    | MQEnum<'prefers-online', 'online' | 'offline'>
    | MQEnum<'scripting', 'none' | 'initial-only' | 'enabled'>

type Suggestion = MediaQueryType | `${MediaQueryType} and ` | `${MediaQueryType}, `

type IsValid<T extends string>
  = string extends T ? true
    : T extends `${infer L}, ${infer R}` ? (IsValid<L> extends true ? IsValid<R> : false)
      : T extends `${infer L} and ${infer R}` ? (IsValid<L> extends true ? IsValid<R> : false)
        : T extends `not ${infer Rest}` ? IsValid<Rest>
          : T extends MediaQueryType ? true
            : false

type ValuesOf<F extends string, MQ = MediaQueryType>
  = MQ extends `(${F}: ${infer V})` ? V : never

type SuggestFeature<F extends string, V extends string>
  = ParseNum<V> extends infer N extends number
    ? `(${F}: ${N}${CSSUnitSuffix})`
    : [ValuesOf<F>] extends [never] ? MediaQueryType : `(${F}: ${ValuesOf<F>})`

type Suggest<T extends string>
  = string extends T ? Suggestion
    : T extends `${infer L}, ${infer R}` ? (IsValid<L> extends true ? `${L}, ${Suggest<R>}` : Suggestion)
      : T extends `${infer L} and ${infer R}` ? (IsValid<L> extends true ? `${L} and ${Suggest<R>}` : Suggestion)
        : T extends `not ${infer Rest}` ? `not ${Suggest<Rest>}`
          : T extends `(${infer F}: ${infer Rest}` ? SuggestFeature<F, Rest extends `${infer V})` ? V : Rest>
            : MediaQueryType

export interface MediaQueryOptions<T extends string> {
  /**
   * A media query string (e.g. `(min-width: 768px)` or `(prefers-color-scheme: dark)`).
   */
  query: IsValid<T> extends true ? T : Suggest<T>
  /**
   * Value returned from `get()` during SSR.
   * @default false
   */
  defaultMatches?: boolean
}

/**
 * Creates a handle for a media query.
 *
 * @example Vanilla
 * ```ts twoslash title="media-query.ts"
 * import { createMediaQuery } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 *
 * const isDesktop = createMediaQuery({ query: '(min-width: 768px)' })
 *
 * // Usage with subscribe
 * isDesktop.subscribe(matches => {
 *   console.log(matches)
 * })
 *
 * const state = isDesktop.get()
 * console.log(state)
 * ```
 *
 * @example React
 * ```tsx twoslash title="page.tsx"
 * import { createMediaQuery } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 *
 * const isDesktop = createMediaQuery({ query: '(min-width: 768px)' })
 *
 * // Usage with some function component
 * function Layout() {
 *   const matches = useSubscription(isDesktop)
 *   return matches ? 'i am desktop' : 'i am mobile'
 * }
 * ```
 *
 * @example Errors
 * ```tsx twoslash
 * import { createMediaQuery } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 *
 * // @errors: 2362 2322 1109
 * createMediaQuery({ query: '(min-width: ' })
 *
 * // @errors: 2362 2322 2820
 * createMediaQuery({ query: '(min-width: 768' })
 * ```
 */
export function createMediaQuery<T extends string>(options: MediaQueryOptions<T>): MediaQuery {
  const { subscribe, notify } = createSubscription()

  const match = typeof window === 'undefined' ? null : window.matchMedia(options.query)

  const get = (): boolean => match?.matches ?? options.defaultMatches ?? false

  match?.addEventListener('change', () => notify())

  return {
    get,
    'subscribe': (callback) => {
      if (typeof window === 'undefined') {
        callback(get())
        return () => {}
      }

      const unsubscribe = subscribe(() => callback(get()))

      const mql = window.matchMedia(options.query)
      const handler = () => callback(get())
      mql.addEventListener('change', handler)
      return () => {
        unsubscribe()
        mql.removeEventListener('change', handler)
      }
    },
    '~': {
      output: null as unknown as boolean,
      notify,
    },
  }
}
