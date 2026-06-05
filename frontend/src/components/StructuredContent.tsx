export type InlinePart = { kind: 'text' | 'strong' | 'code'; value: string }

export type ContentElement =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; parts: InlinePart[] }
  | { type: 'blockquote'; parts: InlinePart[] }
  | { type: 'list'; ordered: boolean; items: InlinePart[][] }
  | { type: 'code'; language: string; code: string }

function renderParts(parts: InlinePart[]) {
  return parts.map((part, i) => {
    if (part.kind === 'strong') return <strong key={i}>{part.value}</strong>
    if (part.kind === 'code') return <code key={i}>{part.value}</code>
    return <span key={i}>{part.value}</span>
  })
}

interface StructuredContentProps {
  elements: ContentElement[]
}

export default function StructuredContent({ elements }: StructuredContentProps) {
  return (
    <>
      {elements.map((el, i) => {
        switch (el.type) {
          case 'heading':
            return el.level === 2 ? (
              <h2 key={i}>{el.text}</h2>
            ) : (
              <h3 key={i}>{el.text}</h3>
            )
          case 'paragraph':
            return <p key={i}>{renderParts(el.parts)}</p>
          case 'blockquote':
            return <blockquote key={i}>{renderParts(el.parts)}</blockquote>
          case 'list':
            return el.ordered ? (
              <ol key={i}>
                {el.items.map((item, j) => (
                  <li key={j}>{renderParts(item)}</li>
                ))}
              </ol>
            ) : (
              <ul key={i}>
                {el.items.map((item, j) => (
                  <li key={j}>{renderParts(item)}</li>
                ))}
              </ul>
            )
          case 'code':
            return (
              <pre key={i}>
                <code className={`language-${el.language}`}>{el.code}</code>
              </pre>
            )
          default:
            return null
        }
      })}
    </>
  )
}
