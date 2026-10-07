import type { ServerReadable, Subscribable } from '../../core'
import { createReadableSubscription, createSubscription } from '../../core'

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

export interface ScrollState
  extends Subscribable<ScrollStateValue>, ServerReadable<ScrollStateValue> {}

export interface ScrollStateOptions {
  /**
   * Element to observe, or a getter. The getter is resolved once, when the
   * first subscriber attaches; a later change to what it returns is not
   * tracked. In React pass the element from a callback ref and list it in
   * `deps` so the subscription is rebuilt on mount, unmount, and remount.
   */
  element: Element | null | (() => Element | null)
  /**
   * @default 'both'
   */
  direction?: ScrollDirection
  /**
   * @default 0
   */
  threshold?: number | ScrollStateThreshold
}

const inactive: ScrollStateEdge = { reached: false, remaining: 0 }
const inactiveState: ScrollStateValue = {
  top: inactive,
  bottom: inactive,
  left: inactive,
  right: inactive,
}

/**
 * Tracks an element's scroll position relative to each edge. Notifies on
 * `scroll` and `ResizeObserver` (not inner content growth — call `'~'.notify()`
 * after that). The element getter is resolved on first subscribe; recreate the
 * handle if the element identity changes (React: `deps`).
 *
 * @example Vanilla
 * ```ts twoslash
 * import { createScrollState } from 'seitu/web'
 *
 * const scroll = createScrollState({
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
 * @example React (callback ref)
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import * as React from 'react'
 * import { createScrollState } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 *
 * function Layout() {
 *   const [ref, setRef] = React.useState<HTMLDivElement | null>(null)
 *   const state = useSubscription(() => createScrollState({
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
export function createScrollState(options: ScrollStateOptions): ScrollState {
  const { direction = 'both', threshold: rawThreshold = 0 } = options

  const t =
    typeof rawThreshold === 'number'
      ? {
          top: rawThreshold,
          bottom: rawThreshold,
          left: rawThreshold,
          right: rawThreshold,
        }
      : {
          top: rawThreshold.top ?? 0,
          bottom: rawThreshold.bottom ?? 0,
          left: rawThreshold.left ?? 0,
          right: rawThreshold.right ?? 0,
        }

  const resolveElement = () =>
    typeof options.element === 'function' ? options.element() : options.element

  const vertical = direction !== 'horizontal'
  const horizontal = direction !== 'vertical'

  // Reuse the previous edge object when it is unchanged, so `get()` keeps its
  // reference between scroll events and bindings skip deep comparison.
  const edge = (
    prev: ScrollStateEdge,
    remaining: number,
    threshold: number
  ): ScrollStateEdge => {
    const clamped = Math.max(0, remaining)
    const reached = remaining <= threshold

    return prev.remaining === clamped && prev.reached === reached
      ? prev
      : { reached, remaining: clamped }
  }

  let last = inactiveState

  const get = (): ScrollStateValue => {
    const element = resolveElement()

    if (!element) {
      return inactiveState
    }

    const { scrollTop, scrollLeft } = element
    const top = vertical ? edge(last.top, scrollTop, t.top) : inactive
    const bottom = vertical
      ? edge(
          last.bottom,
          element.scrollHeight - scrollTop - element.clientHeight,
          t.bottom
        )
      : inactive
    const left = horizontal ? edge(last.left, scrollLeft, t.left) : inactive
    const right = horizontal
      ? edge(
          last.right,
          element.scrollWidth - scrollLeft - element.clientWidth,
          t.right
        )
      : inactive

    if (
      top !== last.top ||
      bottom !== last.bottom ||
      left !== last.left ||
      right !== last.right
    ) {
      last = { top, bottom, left, right }
    }

    return last
  }

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe() {
      const element = resolveElement()
      if (!element) {
        return
      }

      const handler = () => notify()
      element.addEventListener('scroll', handler, { passive: true })

      const observer =
        typeof ResizeObserver === 'undefined'
          ? undefined
          : new ResizeObserver(handler)
      observer?.observe(element)

      return () => {
        element.removeEventListener('scroll', handler)
        observer?.disconnect()
      }
    },
  })

  return createReadableSubscription(get, subscribe, notify, () => inactiveState)
}
