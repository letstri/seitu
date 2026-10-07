import type { ServerReadable, Subscribable } from '../../core'
import { createReadableSubscription, createSubscription } from '../../core'

export interface ElementSizeValue {
  width: number
  height: number
}

export interface ElementSize
  extends Subscribable<ElementSizeValue>, ServerReadable<ElementSizeValue> {}

export interface ElementSizeOptions {
  /**
   * Element to observe, or a getter. The getter is resolved once, when the
   * first subscriber attaches; a later change to what it returns is not
   * tracked. In React pass the element from a callback ref and list it in
   * `deps` so the subscription is rebuilt on mount, unmount, and remount.
   */
  element: Element | null | (() => Element | null)
  /**
   * Which box to measure, same as `ResizeObserver`'s `box` option.
   * @default 'border-box'
   */
  box?: 'content-box' | 'border-box'
}

const emptySize: ElementSizeValue = { width: 0, height: 0 }

/**
 * Tracks an element's width and height through `ResizeObserver`. Sizes ignore
 * CSS transforms. A null element and the server snapshot are `0 × 0`.
 *
 * @example Vanilla
 * ```ts twoslash
 * import { createElementSize } from 'seitu/web'
 *
 * const size = createElementSize({
 *   element: document.querySelector('.container'),
 * })
 *
 * size.subscribe(({ width, height }) => {
 *   console.log(width, height)
 * })
 *
 * const { width } = size.get()
 * console.log(width)
 * ```
 *
 * @example React (callback ref)
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import * as React from 'react'
 * import { createElementSize } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 *
 * function Panel() {
 *   const [ref, setRef] = React.useState<HTMLDivElement | null>(null)
 *   const size = useSubscription(() => createElementSize({
 *     element: ref,
 *   }), { deps: [ref] })
 *
 *   return (
 *     <div ref={setRef}>
 *       {size.width} × {size.height}
 *     </div>
 *   )
 * }
 * ```
 */
export function createElementSize(options: ElementSizeOptions): ElementSize {
  const { box = 'border-box' } = options

  const resolveElement = () =>
    typeof options.element === 'function' ? options.element() : options.element

  // ponytail: computed width includes a scrollbar, ResizeObserver's content-box
  // does not. Cache the observer entry if that gap matters.
  const measure = (): ElementSizeValue => {
    const element = resolveElement()

    if (!element) {
      return emptySize
    }

    const style = getComputedStyle(element)
    const px = (value: string) => Number.parseFloat(value) || 0
    const extraX =
      px(style.paddingLeft) +
      px(style.paddingRight) +
      px(style.borderLeftWidth) +
      px(style.borderRightWidth)
    const extraY =
      px(style.paddingTop) +
      px(style.paddingBottom) +
      px(style.borderTopWidth) +
      px(style.borderBottomWidth)
    const width = px(style.width)
    const height = px(style.height)
    const isBorderBox = style.boxSizing === 'border-box'

    // Inline and hidden elements report `auto`, which ResizeObserver sees as 0.
    if (!width && !height) {
      return emptySize
    }

    if (box === 'border-box') {
      return isBorderBox
        ? { width, height }
        : { width: width + extraX, height: height + extraY }
    }

    return isBorderBox
      ? {
          width: Math.max(0, width - extraX),
          height: Math.max(0, height - extraY),
        }
      : { width, height }
  }

  let last = emptySize
  // While observed, the size only changes when ResizeObserver fires, so reads
  // reuse one measurement instead of forcing a style recalc each time.
  let observed = false
  let stale = true

  const get = (): ElementSizeValue => {
    if (observed && !stale) {
      return last
    }

    const next = measure()
    if (next.width !== last.width || next.height !== last.height) {
      last = next
    }
    stale = !observed

    return last
  }

  const { subscribe, notify: notifySubscribers } = createSubscription({
    onFirstSubscribe() {
      const element = resolveElement()
      if (!element || typeof ResizeObserver === 'undefined') {
        return
      }

      const observer = new ResizeObserver(() => notify())
      observer.observe(element, { box })
      observed = true
      stale = true

      return () => {
        observer.disconnect()
        observed = false
      }
    },
  })

  const notify = () => {
    stale = true
    notifySubscribers()
  }

  return createReadableSubscription(get, subscribe, notify, () => emptySize)
}
