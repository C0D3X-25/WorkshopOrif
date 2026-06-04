/**
 * One-off helper: split chapter bodies with GFM tables into blocks[].
 * Usage: node scripts/extract-markdown-tables.mjs <json-path>
 */
import { readFileSync, writeFileSync } from 'fs'

const TABLE_RE = /\n(\|[^\n]+\|\n\|[-: |]+\|\n(?:\|[^\n]+\|\n)+)/g

function parseRow(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim())
}

function parseTable(md) {
  const lines = md.trim().split('\n').filter((l) => l.startsWith('|'))
  return {
    type: 'table',
    headers: parseRow(lines[0]),
    rows: lines.slice(2).map(parseRow),
  }
}

function bodyToBlocks(body) {
  const blocks = []
  let lastIndex = 0
  let match
  TABLE_RE.lastIndex = 0
  while ((match = TABLE_RE.exec(body)) !== null) {
    const before = body.slice(lastIndex, match.index)
    if (before) blocks.push({ type: 'markdown', content: before })
    blocks.push(parseTable(match[1]))
    lastIndex = match.index + match[0].length
  }
  const rest = body.slice(lastIndex)
  if (rest) blocks.push({ type: 'markdown', content: rest })
  return blocks
}

const path = process.argv[2]
if (!path) {
  console.error('Usage: node scripts/extract-markdown-tables.mjs <workshop.json>')
  process.exit(1)
}

const workshop = JSON.parse(readFileSync(path, 'utf8'))
let converted = 0

for (const chapter of workshop.chapters ?? []) {
  if (!chapter.body?.includes('|')) continue
  const blocks = bodyToBlocks(chapter.body)
  if (blocks.some((b) => b.type === 'table')) {
    chapter.blocks = blocks
    chapter.body = ''
    converted++
  }
}

writeFileSync(path, JSON.stringify(workshop, null, 2) + '\n', 'utf8')
console.log(`Updated ${path}: ${converted} chapter(s) with blocks`)
