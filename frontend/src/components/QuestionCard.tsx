import { useMemo, useState } from 'react'
import './QuestionCard.css'

interface QuestionOption {
  text: string
  isCorrect: boolean
}

export interface Question {
  text: string
  type: string
  options: QuestionOption[]
  explanation: string
}

interface Props {
  question: Question
  index: number
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuestionCard({ question, index }: Props) {
  const shuffledOptions = useMemo(() => shuffle(question.options), [question.options])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [revealed, setRevealed] = useState(false)

  const handleSingleClick = (i: number) => {
    if (revealed) return
    setSelectedIndex(i)
    setRevealed(true)
  }

  const handleMultipleToggle = (i: number) => {
    if (revealed) return
    setSelectedIndices(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    )
  }

  const handleVerify = () => {
    if (selectedIndices.length === 0) return
    setRevealed(true)
  }

  const getOptionClass = (i: number): string => {
    const base = 'qcard-option'
    if (!revealed) {
      if (question.type === 'multiple' && selectedIndices.includes(i)) return `${base} selected`
      return base
    }
    const isCorrect = shuffledOptions[i].isCorrect
    const wasSelected = question.type === 'single' ? selectedIndex === i : selectedIndices.includes(i)
    if (isCorrect) return `${base} correct`
    if (wasSelected && !isCorrect) return `${base} wrong`
    return base
  }

  return (
    <div className={`qcard${revealed ? ' qcard--revealed' : ''}`}>
      <p className="qcard-text">
        <span className="qcard-index">Q{index + 1}</span>
        {question.text}
      </p>
      {question.type === 'multiple' && !revealed && (
        <p className="qcard-hint">Plusieurs réponses possibles</p>
      )}
      <div className="qcard-options">
        {shuffledOptions.map((opt, i) => (
          <button
            key={i}
            className={getOptionClass(i)}
            onClick={() =>
              question.type === 'single'
                ? handleSingleClick(i)
                : handleMultipleToggle(i)
            }
            disabled={revealed}
          >
            {opt.text}
          </button>
        ))}
      </div>
      {question.type === 'multiple' && !revealed && (
        <button
          className="qcard-verify"
          onClick={handleVerify}
          disabled={selectedIndices.length === 0}
        >
          Vérifier
        </button>
      )}
      {revealed && (
        <div className="qcard-explanation">
          <strong>Explication&nbsp;:</strong> {question.explanation}
        </div>
      )}
    </div>
  )
}
