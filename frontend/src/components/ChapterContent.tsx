import ReactMarkdown from 'react-markdown'
import ContentTable, { type ContentTableData } from './ContentTable'
import StructuredContent, { type ContentElement } from './StructuredContent'

export type MarkdownBlock = { type: 'markdown'; content: string }
export type RichBlock = { type: 'content'; elements: ContentElement[] }
export type TableBlock = { type: 'table' } & ContentTableData
export type ContentBlock = MarkdownBlock | RichBlock | TableBlock

interface ChapterContentProps {
  body?: string
  blocks?: ContentBlock[]
}

export default function ChapterContent({ body = '', blocks }: ChapterContentProps) {
  const items: ContentBlock[] =
    blocks && blocks.length > 0
      ? blocks
      : body
        ? [{ type: 'markdown', content: body }]
        : []

  return (
    <>
      {items.map((block, i) => {
        if (block.type === 'markdown') {
          return <ReactMarkdown key={i}>{block.content}</ReactMarkdown>
        }
        if (block.type === 'content') {
          return <StructuredContent key={i} elements={block.elements} />
        }
        return <ContentTable key={i} headers={block.headers} rows={block.rows} />
      })}
    </>
  )
}
