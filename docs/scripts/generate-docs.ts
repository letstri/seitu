import fs from 'node:fs/promises'
import path from 'node:path'

import jsdoc2md from 'jsdoc-to-markdown'
import ts from 'typescript'

const OUTPUT_PATH_REGEXP = /(?:[/\\]index)?\.(?<ext>ts|tsx)$/u

const UNDOCUMENTED_GROUPS = new Set(['internal', 'utils'])

const MERGED_PAGES = [
  ['web/indexed-db', 'web/indexed-db-storage', 'web/indexed-db-table'],
]

const rootDir = path.resolve(import.meta.dirname, '..')
const srcDir = path.join(rootDir, '../', 'seitu', 'src')
const outDir = path.join(rootDir, 'content', 'docs')
const scopePartialPath = path.join(rootDir, 'scripts', 'partials', 'scope.hbs')
const examplesPartialPath = path.join(
  rootDir,
  'scripts',
  'partials',
  'examples.hbs'
)

const TS_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
}

async function findSourceFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        // `internal/` is private; `utils/` is only used through the web primitives.
        return UNDOCUMENTED_GROUPS.has(entry.name) && dir === srcDir
          ? []
          : findSourceFiles(fullPath)
      }
      if (
        entry.isFile() &&
        (entry.name === 'index.ts' || entry.name === 'index.tsx') &&
        path.relative(srcDir, fullPath).split(path.sep).length === 3
      ) {
        return [fullPath]
      }
      return []
    })
  )
  return nested.flat()
}

const EXAMPLE_CAPTION_REGEXP = /@example +(?!<caption>)(?<caption>\S[^\n]*)/gu

function normalizeExampleCaptions(code: string): string {
  return code.replace(
    EXAMPLE_CAPTION_REGEXP,
    '@example <caption>$<caption></caption>'
  )
}

function extractJSDocForExportedFunctions(
  code: string,
  filePath: string
): Map<string, string> {
  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true
  )
  const text = sourceFile.getFullText()
  const map = new Map<string, string>()

  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.getText(sourceFile)
      const exported = node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword
      )
      if (!exported || map.has(name)) {
        return
      }
      const commentRanges = ts.getLeadingCommentRanges(
        text,
        node.getFullStart()
      )
      const last = commentRanges?.at(-1)
      if (last) {
        const comment = text.slice(last.pos, last.end)
        if (comment.startsWith('/**')) {
          map.set(name, comment)
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return map
}

const ESCAPE_REGEXP = /[.*+?^${}()|[\]\\]/gu

function injectJSDocIntoJs(
  js: string,
  jsdocByFunction: Map<string, string>
): string {
  if (jsdocByFunction.size === 0) {
    return js
  }
  let out = js
  const escapeRe = (s: string) => s.replace(ESCAPE_REGEXP, '\\$&')
  for (const [name, jsdoc] of jsdocByFunction) {
    const re = new RegExp(
      `(?<decl>export\\s+function\\s+${escapeRe(name)}\\s*\\()`,
      'mu'
    )
    const m = re.exec(out)
    if (m) {
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
    .replace(/## Functions\n\n<dl>[\s\S]*?<\/dl>\n*/u, '')
    .replaceAll(/<a name="[^"]*"><\/a>\n*/gu, '')
    .replaceAll(/\n{3,}/gu, '\n\n')
}

function getOutputPath(sourcePath: string): string {
  const rel = path
    .relative(srcDir, sourcePath)
    .replace(OUTPUT_PATH_REGEXP, '.mdx')
  return path.join(outDir, rel)
}

const FIRST_SENTENCE_REGEXP = /^(?<sentence>.*?[.!?])(?:\s|$)/u

function getPageDescription(jsdocMap: Map<string, string>): string | undefined {
  const first = jsdocMap.values().next().value
  if (!first) {
    return undefined
  }
  const body = first
    .replace(/^\/\*\*\s*/u, '')
    .replace(/\s*\*\/$/u, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/u, ''))
    .join('\n')
    .split(/\n@/u)[0]
    .trim()
  const paragraph = body.split(/\n\s*\n/u)[0].replaceAll(/\s*\n\s*/gu, ' ')
  const sentence =
    FIRST_SENTENCE_REGEXP.exec(paragraph)?.groups?.sentence ?? paragraph
  return (
    sentence
      .replaceAll(/`(?<code>[^`]+)`/gu, '$<code>')
      .replaceAll(/\*\*(?<bold>[^*]+)\*\*/gu, '$<bold>')
      .replaceAll('"', '\\"')
      .trim() || undefined
  )
}

function getPageTitle(sourcePath: string): string {
  const rel = path.relative(srcDir, sourcePath).replace(OUTPUT_PATH_REGEXP, '')
  const name = path.basename(rel)
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function getFeatureKey(sourcePath: string): string {
  return path
    .relative(srcDir, sourcePath)
    .replace(OUTPUT_PATH_REGEXP, '')
    .split(path.sep)
    .join('/')
}

function groupIntoPages(files: string[]): string[][] {
  const byFeature = new Map(files.map((file) => [getFeatureKey(file), file]))
  const mergedKeys = new Set(MERGED_PAGES.flat())
  const pages = MERGED_PAGES.map((keys) =>
    keys.map((key) => byFeature.get(key)).filter((file) => file !== undefined)
  ).filter((sources) => sources.length > 0)

  for (const [key, file] of byFeature) {
    if (!mergedKeys.has(key)) {
      pages.push([file])
    }
  }
  return pages
}

async function renderSection(
  sourcePath: string
): Promise<{ markdown: string; jsdocMap: Map<string, string> } | undefined> {
  const raw = await fs.readFile(sourcePath, 'utf-8')
  const code = normalizeExampleCaptions(raw)
  const jsdocMap = extractJSDocForExportedFunctions(code, sourcePath)
  const js = injectJSDocIntoJs(transpileToJs(code, sourcePath), jsdocMap)

  const markdown = await jsdoc2md.render({
    'heading-depth': 2,
    separators: true,
    'example-lang': 'ts',
    'param-list-format': 'table',
    'property-list-format': 'table',
    'no-cache': true,
    source: js,
    partial: [scopePartialPath, examplesPartialPath],
  })
  if (!markdown) {
    console.warn('No markdown for', sourcePath)
    return undefined
  }

  return { markdown: stripHtml(markdown).trim(), jsdocMap }
}

/** The first source owns the page's path, title and description. */
async function generateDocForPage(sourcePaths: string[]): Promise<void> {
  const [primary] = sourcePaths
  const sections = []
  for (const sourcePath of sourcePaths) {
    const section = await renderSection(sourcePath)
    if (section) {
      sections.push(section)
    }
  }
  if (sections.length === 0) {
    return
  }

  const title = getPageTitle(primary)
  const description = getPageDescription(sections[0].jsdocMap)
  const frontmatter = [
    '---',
    `title: ${title}`,
    description ? `description: "${description}"` : undefined,
    '---',
  ]
    .filter(Boolean)
    .join('\n')
  const body = sections.map((section) => section.markdown).join('\n\n')
  const outPath = getOutputPath(primary)
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, `${frontmatter}\n\n${body}\n`, 'utf-8')
  console.log('Generated', outPath)
}

async function main(): Promise<void> {
  const files = await findSourceFiles(srcDir)
  if (files.length === 0) {
    console.warn('No source files in', srcDir)
    return
  }

  // Sequential: parallel `jsdoc2md.render` calls race on jsdoc's temp files and one of
  // them comes back empty ("Unexpected end of JSON input"), which fails the build.
  for (const sourcePaths of groupIntoPages(files)) {
    await generateDocForPage(sourcePaths)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
