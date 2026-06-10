import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const skillsPath = path.join(currentDir, '../..', 'skills')
const distSkillsPath = path.join(currentDir, '..', 'skills')

fs.cpSync(skillsPath, distSkillsPath, { recursive: true })
