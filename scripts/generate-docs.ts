import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import jsdoc2md from 'jsdoc-to-markdown'
import ts from 'typescript'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(rootDir, 'seitu', 'src')
const outDir = path.join(rootDir, 'docs', 'content', 'docs')

const TS_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
}

async function findSourceFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const results: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...await findSourceFiles(fullPath))
    }
    else if (
      entry.isFile()
      && entry.name.endsWith('.ts')
      && !entry.name.includes('.test.')
      && entry.name !== 'index.ts'
    ) {
      results.push(fullPath)
    }
  }
  return results
}

function extractJSDocForExportedFunctions(code: string, filePath: string): Map<string, string> {
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true)
  const text = sourceFile.getFullText()
  const map = new Map<string, string>()

  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.getText(sourceFile)
      const exported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
      if (!exported || map.has(name))
        return
      const commentRanges = ts.getLeadingCommentRanges(text, node.getFullStart())
      const last = commentRanges?.[commentRanges.length - 1]
      if (last) {
        const comment = text.slice(last.pos, last.end)
        if (comment.startsWith('/**'))
          map.set(name, comment)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return map
}

function injectJSDocIntoJs(js: string, jsdocByFunction: Map<string, string>): string {
  if (jsdocByFunction.size === 0)
    return js
  let out = js
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  for (const [name, jsdoc] of jsdocByFunction) {
    const re = new RegExp(`(export\\s+function\\s+${escapeRe(name)}\\s*\\()`, 'm')
    const m = out.match(re)
    if (m?.index != null) {
      out = `${out.slice(0, m.index) + jsdoc}\n${out.slice(m.index)}`
    }
  }
  return out
}

function transpileToJs(code: string, filePath: string): string {
  return ts.transpileModule(code, {
    compilerOptions: TS_COMPILER_OPTIONS,
    fileName: filePath,
  }).outputText
}

function getOutputPath(sourcePath: string): string {
  const rel = path.relative(srcDir, sourcePath).replace(/\.ts$/, '.mdx')
  return path.join(outDir, rel)
}

function getPageTitle(sourcePath: string): string {
  const rel = path.relative(srcDir, sourcePath).replace(/\.ts$/, '')
  const name = path.basename(rel)
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

async function generateDocForFile(sourcePath: string): Promise<void> {
  const code = await fs.readFile(sourcePath, 'utf8')
  const jsdocMap = extractJSDocForExportedFunctions(code, sourcePath)
  const js = injectJSDocIntoJs(transpileToJs(code, sourcePath), jsdocMap)

  const markdown = await jsdoc2md.render({
    'heading-depth': 2,
    'separators': true,
    'example-lang': 'ts',
    'param-list-format': 'list',
    'property-list-format': 'list',
    'no-cache': true,
    'source': js,
  })
  if (!markdown) {
    console.warn('No markdown for', sourcePath)
    return
  }

  const title = getPageTitle(sourcePath)
  const outPath = getOutputPath(sourcePath)
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, `---\ntitle: ${title}\n---\n\n${markdown}`, 'utf8')
  console.log('Generated', outPath)
}

async function main(): Promise<void> {
  const files = await findSourceFiles(srcDir)
  if (files.length === 0) {
    console.warn('No source files in', srcDir)
    return
  }

  for (const file of files) {
    await generateDocForFile(file)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
