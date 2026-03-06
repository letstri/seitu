'use client'

import { useState } from 'react'
import { useSubscription } from 'seitu/react'
import { scrollState } from 'seitu/web'

export default function Home() {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const scroll = useSubscription(() => scrollState({ element }), { deps: [element] })

  console.table([
    {
      'Edge': 'Top',
      'At Edge?': scroll.top.value ? 'Yes' : 'No',
      'Remaining px': scroll.top.remaining,
    },
    {
      'Edge': 'Bottom',
      'At Edge?': scroll.bottom.value ? 'Yes' : 'No',
      'Remaining px': scroll.bottom.remaining,
    },
    {
      'Edge': 'Left',
      'At Edge?': scroll.left.value ? 'Yes' : 'No',
      'Remaining px': scroll.left.remaining,
    },
    {
      'Edge': 'Right',
      'At Edge?': scroll.right.value ? 'Yes' : 'No',
      'Remaining px': scroll.right.remaining,
    },
  ])

  return (
    <div ref={setElement} className="size-[500px] mx-auto overflow-y-auto">
      <div className="size-[1000px]">
        Lorem ipsum dolor, sit amet consectetur adipisicing elit. Aperiam laudantium ipsam possimus accusantium quam qui sapiente sint velit, error atque repellendus nostrum sequi aut iure veritatis. Obcaecati voluptate magnam accusamus!
      </div>
    </div>
  )
}
