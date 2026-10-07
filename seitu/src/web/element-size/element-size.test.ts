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

  it('measures the border box by default', () => {
    const el = createElement(
      'width: 100px; height: 50px; padding: 10px; border: 2px solid'
    )
    expect(createElementSize({ element: el }).get()).toEqual({
      width: 124,
      height: 74,
    })
  })

  it('measures the content box', () => {
    const el = createElement(
      'width: 100px; height: 50px; padding: 10px; border: 2px solid'
    )
    expect(
      createElementSize({ element: el, box: 'content-box' }).get()
    ).toEqual({ width: 100, height: 50 })
  })

  it('accounts for box-sizing: border-box', () => {
    const el = createElement(
      'box-sizing: border-box; width: 100px; height: 50px; padding: 10px; border: 2px solid'
    )
    expect(createElementSize({ element: el }).get()).toEqual({
      width: 100,
      height: 50,
    })
    expect(
      createElementSize({ element: el, box: 'content-box' }).get()
    ).toEqual({ width: 76, height: 26 })
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
    const size = createElementSize({ element: el })
    const callback = vi.fn()
    const unsubscribe = size.subscribe(callback)

    expect(observe).toHaveBeenCalledWith(el, { box: 'border-box' })

    el.style.width = '200px'
    resize?.()
    expect(callback).toHaveBeenCalledWith({ width: 200, height: 50 })

    unsubscribe()
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('keeps the same reference while the size is unchanged', () => {
    const el = createElement('width: 100px; height: 50px')
    const size = createElementSize({ element: el })

    const first = size.get()
    expect(size.get()).toBe(first)

    el.style.width = '120px'
    expect(size.get()).toEqual({ width: 120, height: 50 })
  })

  it('measures once per resize while observed', () => {
    let resize: (() => void) | undefined
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          resize = cb
        }

        observe() {}
        disconnect() {}
      }
    )
    const getComputedStyle = vi.spyOn(window, 'getComputedStyle')

    const el = createElement('width: 100px; height: 50px')
    const size = createElementSize({ element: el })
    const unsubscribe = size.subscribe(() => {})

    size.get()
    size.get()
    expect(getComputedStyle).toHaveBeenCalledOnce()

    el.style.width = '200px'
    resize?.()
    expect(size.get()).toEqual({ width: 200, height: 50 })
    size.get()
    expect(getComputedStyle).toHaveBeenCalledTimes(2)

    // A manual notify re-measures, as before.
    el.style.width = '300px'
    size['~'].notify()
    expect(size.get()).toEqual({ width: 300, height: 50 })

    unsubscribe()
    getComputedStyle.mockRestore()
  })
})
