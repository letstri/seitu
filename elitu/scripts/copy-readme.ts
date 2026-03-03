import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const readmePath = path.join(currentDir, '../..', 'README.md')
const distReadmePath = path.join(currentDir, '..', 'README.md')

fs.copyFileSync(readmePath, distReadmePath)
