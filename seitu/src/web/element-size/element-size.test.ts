import { afterEach, describe, expect, it, vi } from 'vitest'

import { createElementSize } from './index'

function createElement(style: string) {
  const el = document.createElement('div')
  el.setAttribute('style', style)
  document.body.append(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('createElementSize', () => {
  it('returns 0 × 0 for a null element and on the server', () => {
    const size = createElementSize({ element: null })
    expect(size.get()).toEqual({ width: 0, height: 0 })
    expect(size.getServer()).toEqual({ width: 0, height: 0 })
  })

  it('measures the content box by default', () => {
    const el = createElement(
      'width: 100px; height: 50px; padding: 10px; border: 2px solid'
    )
    expect(createElementSize({ element: el }).get()).toEqual({
      width: 100,
      height: 50,
    })
  })

  it('measures the border box', () => {
    const el = createElement(
      'width: 100px; height: 50px; padding: 10px; border: 2px solid'
    )
    expect(createElementSize({ element: el, box: 'border-box' }).get()).toEqual(
      { width: 124, height: 74 }
    )
  })

  it('accounts for box-sizing: border-box', () => {
    const el = createElement(
      'box-sizing: border-box; width: 100px; height: 50px; padding: 10px; border: 2px solid'
    )
    expect(createElementSize({ element: el }).get()).toEqual({
      width: 76,
      height: 26,
    })
    expect(createElementSize({ element: el, box: 'border-box' }).get()).toEqual(
      { width: 100, height: 50 }
    )
  })

  it('resolves a getter', () => {
    const el = createElement('width: 30px; height: 20px')
    expect(createElementSize({ element: () => el }).get()).toEqual({
      width: 30,
      height: 20,
    })
  })

  it('observes the element and notifies on resize', () => {
    let resize: (() => void) | undefined
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          resize = cb
        }

        observe = observe
        disconnect = disconnect
      }
    )

    const el = createElement('width: 100px; height: 50px')
    const size = createElementSize({ element: el, box: 'border-box' })
    const callback = vi.fn()
    const unsubscribe = size.subscribe(callback)

    expect(observe).toHaveBeenCalledWith(el, { box: 'border-box' })

    el.style.width = '200px'
    resize?.()
    expect(callback).toHaveBeenCalledWith({ width: 200, height: 50 })

    unsubscribe()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
