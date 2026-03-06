import type { Readable, Subscribable } from '../core/index'
import { createSubscription } from '../core/index'

export type ScrollDirection = 'vertical' | 'horizontal' | 'both'

export interface ScrollStateEdge {
  reached: boolean
  remaining: number
}

export interface ScrollStateValue {
  top: ScrollStateEdge
  bottom: ScrollStateEdge
  left: ScrollStateEdge
  right: ScrollStateEdge
}

export interface ScrollStateThreshold {
  top?: number
  bottom?: number
  left?: number
  right?: number
}

export interface ScrollState extends Subscribable<ScrollStateValue>, Readable<ScrollStateValue> {}

export interface ScrollStateOptions {
  /**
   * The element to observe scroll position on.
   * Accepts an element directly, or a getter function for lazy resolution
   * (useful with React refs that aren't available during render).
   */
  element: Element | null | (() => Element | null)
  /**
   * Which scroll axis to track.
   * @default 'both'
   */
  direction?: ScrollDirection
  /**
   * Number of pixels from each edge before it counts as "reached".
   * Pass a single number to apply the same threshold to all edges,
   * or an object with per-side values.
   * @default 0
   */
  threshold?: number | ScrollStateThreshold
}

const inactive: ScrollStateEdge = { reached: false, remaining: 0 }

/**
 * Creates a reactive handle that tracks scroll position of an element relative to each edge.
 *
 * @example Vanilla
 * ```ts twoslash
 * import { scrollState } from 'seitu/web'
 *
 * const scroll = scrollState({
 *   element: document.querySelector('.container'),
 *   direction: 'vertical',
 *   threshold: 10,
 * })
 *
 * scroll.subscribe(state => {
 *   console.log(state.top.reached)
 *   console.log(state.top.remaining)
 *   console.log(state.bottom.reached)
 *   console.log(state.bottom.remaining)
 * })
 *
 * const state = scroll.get()
 * console.log(state)
 * ```
 *
 * @example React (with useRef)
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import * as React from 'react'
 * import { scrollState } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 *
 * function Layout() {
 *   const ref = React.useRef<HTMLDivElement>(null)
 *   const state = useSubscription(() => scrollState({
 *     element: () => ref.current,
 *     threshold: 10,
 *   }))
 *
 *   return (
 *     <div ref={ref}>
 *       {state.top.reached ? 'at the top' : 'scrolled'}
 *     </div>
 *   )
 * }
 * ```
 *
 * @example React (with useState)
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import * as React from 'react'
 * import { scrollState } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 *
 * function Layout() {
 *   const [ref, setRef] = React.useState<HTMLDivElement | null>(null)
 *   const state = useSubscription(() => scrollState({
 *     element: ref,
 *     threshold: 10,
 *   }), { deps: [ref] })
 *
 *   return (
 *     <div ref={setRef}>
 *       {state.top.reached ? 'at the top' : 'scrolled'}
 *     </div>
 *   )
 * }
 * ```
 */
export function scrollState(options: ScrollStateOptions): ScrollState {
  const { direction = 'both', threshold: rawThreshold = 0 } = options
  const { subscribe, notify } = createSubscription()

  const t = typeof rawThreshold === 'number'
    ? { top: rawThreshold, bottom: rawThreshold, left: rawThreshold, right: rawThreshold }
    : { top: rawThreshold.top ?? 0, bottom: rawThreshold.bottom ?? 0, left: rawThreshold.left ?? 0, right: rawThreshold.right ?? 0 }

  const resolveElement = (): Element | null =>
    typeof options.element === 'function' ? options.element() : options.element

  const get = (): ScrollStateValue => {
    const element = resolveElement()

    const edge = (reached: boolean, remaining: number): ScrollStateEdge => ({ reached, remaining: Math.max(0, remaining) })

    if (!element) {
      return { top: inactive, bottom: inactive, left: inactive, right: inactive }
    }

    const remainingTop = element.scrollTop
    const remainingBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    const remainingLeft = element.scrollLeft
    const remainingRight = element.scrollWidth - element.scrollLeft - element.clientWidth

    return {
      top: direction !== 'horizontal' ? edge(remainingTop <= t.top, remainingTop) : inactive,
      bottom: direction !== 'horizontal' ? edge(remainingBottom <= t.bottom, remainingBottom) : inactive,
      left: direction !== 'vertical' ? edge(remainingLeft <= t.left, remainingLeft) : inactive,
      right: direction !== 'vertical' ? edge(remainingRight <= t.right, remainingRight) : inactive,
    }
  }

  return {
    get,
    'subscribe': (callback) => {
      const element = resolveElement()

      if (!element) {
        callback(get())
        return () => {}
      }

      const unsubscribe = subscribe(() => callback(get()))

      const handler = () => callback(get())
      element.addEventListener('scroll', handler, { passive: true })

      return () => {
        unsubscribe()
        element.removeEventListener('scroll', handler)
      }
    },
    '~': {
      output: null as unknown as ScrollStateValue,
      notify,
    },
  }
}
