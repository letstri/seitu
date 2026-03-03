# Elitu

[![npm version](https://badge.fury.io/js/elitu.svg)](https://npmjs.com/package/elitu)
![You need Elitu](https://img.shields.io/badge/You_need-Elitu-purple)

Elitu is a lightweight, framework-agnostic, type-safe utilities library for JavaScript applications on the client and server sides.

## Documentation

You can find the documentation [here](https://elitu.letstri.dev).

## Example

To quick start you only need to write the following code:

```tsx
import { useSubscription } from 'elitu/react'
import { sessionStorageValue } from 'elitu/web'
import * as z from 'zod'

const value = sessionStorageValue({
  key: 'test',
  defaultValue: 0,
  schema: z.number(),
})

value.get() // 0
value.set(1)
value.remove()
value.subscribe(v => console.log(v))

function Counter() {
  const count = useSubscription(value)

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => value.set(c => c + 1)}>Increment</button>
    </div>
  )
}
```

Elitu has other powerful features, so check out the [docs](https://elitu.letstri.dev/docs) or the [examples](https://github.com/letstri/elitu/tree/main/examples) directory.

## License

MIT License - see the [LICENSE](https://github.com/letstri/elitu/blob/main/LICENSE) file for details
