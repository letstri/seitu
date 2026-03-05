import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    execArgv: [
      '--localstorage-file',
      path.resolve(os.tmpdir(), `vitest-${process.pid}.localstorage`),
    ],
  },
})
