'use client'

import * as React from 'react'
import { useSubscription } from 'seitu/react'
import { createScrollState } from 'seitu/web'

export default function Page() {
  const renderCount = React.useRef(0).current++
  const ref = React.useRef<HTMLDivElement>(null)
  const scrollState = useSubscription(() => createScrollState({ element: () => ref.current, direction: 'vertical' }))

  return (
    <div
      ref={ref}
      style={{
        height: 300,
        width: '100%',
        overflowY: 'auto',
        border: '1px solid #ccc',
        padding: 16,
        marginTop: 32,
        background: '#fafafa',
      }}
    >
      <div style={{ height: 800 }}>
        <div>
          <strong>Scroll to see state updates</strong>
          <span>
            Render count:
            {renderCount}
          </span>
        </div>
        <div style={{ margin: '24px 0' }}>
          <pre>
            {JSON.stringify(
              {
                top: scrollState.top,
                bottom: scrollState.bottom,
                scrollTop: scrollState.top.remaining,
                scrollHeight: scrollState.bottom.remaining,
                clientHeight: scrollState.bottom.remaining,
              },
              null,
              2,
            )}
          </pre>
        </div>
        <div>
          <div style={{ height: 600 }}>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum.
              Cras venenatis euismod malesuada. Curabitur eleifend, libero nec ullamcorper sagittis, urna augue blandit enim,
              eu tempor magna dolor non urna.
            </p>
            <p>
              Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.
              Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante.
            </p>
          </div>
          <div>
            <strong>Bottom of content</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
