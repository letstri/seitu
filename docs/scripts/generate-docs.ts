/* eslint-disable e18e/prefer-static-regex */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import jsdoc2md from 'jsdoc-to-markdown'
import ts from 'typescript'

const OUTPUT_PATH_REGEXP = /\.(ts|tsx)$/

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(rootDir, '../', 'seitu', 'src')
const outDir = path.join(rootDir, 'content', 'docs')
const scopePartialPath = path.join(rootDir, 'scripts', 'partials', 'scope.hbs')
const examplesPartialPath = path.join(rootDir, 'scripts', 'partials', 'examples.hbs')

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
      && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))
      && !entry.name.includes('.test.')
      && entry.name !== 'index.ts'
    ) {
      results.push(fullPath)
    }
  }
  return results
}

const EXAMPLE_CAPTION_REGEXP = /@example +(?!<caption>)(\S[^\n]*)/g

function normalizeExampleCaptions(code: string): string {
  return code.replace(EXAMPLE_CAPTION_REGEXP, '@example <caption>$1</caption>')
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
      const last = commentRanges?.at(-1)
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

const ESCAPE_REGEXP = /[.*+?^${}()|[\]\\]/g

function injectJSDocIntoJs(js: string, jsdocByFunction: Map<string, string>): string {
  if (jsdocByFunction.size === 0)
    return js
  let out = js
  const escapeRe = (s: string) => s.replace(ESCAPE_REGEXP, '\\$&')
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

function stripHtml(markdown: string): string {
  return markdown
    .replace(/## Functions\n\n<dl>[\s\S]*?<\/dl>\n*/, '')
    .replace(/<a name="[^"]*"><\/a>\n*/g, '')
    .replace(/\n{3,}/g, '\n\n')
}

function getOutputPath(sourcePath: string): string {
  const rel = path.relative(srcDir, sourcePath).replace(OUTPUT_PATH_REGEXP, '.mdx')
  return path.join(outDir, rel)
}

function getPageTitle(sourcePath: string): string {
  const rel = path.relative(srcDir, sourcePath).replace(OUTPUT_PATH_REGEXP, '')
  const name = path.basename(rel)
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

async function generateDocForFile(sourcePath: string): Promise<void> {
  const raw = await fs.readFile(sourcePath, 'utf8')
  const code = normalizeExampleCaptions(raw)
  const jsdocMap = extractJSDocForExportedFunctions(code, sourcePath)
  const js = injectJSDocIntoJs(transpileToJs(code, sourcePath), jsdocMap)

  const markdown = await jsdoc2md.render({
    'heading-depth': 2,
    'separators': true,
    'example-lang': 'ts',
    'param-list-format': 'table',
    'property-list-format': 'table',
    'no-cache': true,
    'source': js,
    'partial': [scopePartialPath, examplesPartialPath],
  })
  if (!markdown) {
    console.warn('No markdown for', sourcePath)
    return
  }

  const cleaned = stripHtml(markdown)
  const title = getPageTitle(sourcePath)
  const outPath = getOutputPath(sourcePath)
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, `---\ntitle: ${title}\n---\n\n${cleaned}`, 'utf8')
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
