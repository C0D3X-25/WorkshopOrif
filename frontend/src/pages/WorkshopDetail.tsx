import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import QuestionCard, { type Question } from '../components/QuestionCard'
import './WorkshopDetail.css'

interface Workshop {
  id: string
  title: string
  description: string
  type: number
  level: number
  track: string
  authors: string[]
  prerequisites: string[]
  maxConcurrentParticipants: number
  requiredMaterials: string[]
  estimatedDuration: number
  expectedOutcome: string
  contentFr: string
  date: string
  questions: Question[]
}

const TYPE_LABELS: Record<number, string> = { 0: 'Theory', 1: 'Exercise' }
const LEVEL_LABELS: Record<number, string> = { 0: 'Introduction', 1: 'Advanced' }

export default function WorkshopDetail() {
  const { id } = useParams<{ id: string }>()
  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/workshops/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<Workshop>
      })
      .then(setWorkshop)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <main className="workshop-detail"><p>Chargement…</p></main>
  if (error || !workshop) return <main className="workshop-detail"><p className="error">Atelier introuvable.</p></main>

  return (
    <main className="workshop-detail">
      <nav className="detail-nav">
        <Link to="/workshops">← Retour aux ateliers</Link>
      </nav>

      <article>
        <header className="detail-header">
          <div className="detail-badges">
            <span className={`badge type-${TYPE_LABELS[workshop.type]?.toLowerCase()}`}>
              {TYPE_LABELS[workshop.type]}
            </span>
            <span className={`badge level-${LEVEL_LABELS[workshop.level]?.toLowerCase()}`}>
              {LEVEL_LABELS[workshop.level]}
            </span>
          </div>
          <h1>{workshop.title}</h1>
          {workshop.description && <p className="detail-description">{workshop.description}</p>}
        </header>

        <section className="detail-summary">
          <h2>Fiche récapitulative</h2>
          <table>
            <tbody>
              {workshop.authors?.length > 0 && (
                <tr><th>Auteur(s)</th><td>{workshop.authors.join(', ')}</td></tr>
              )}
              {workshop.track && (
                <tr><th>Parcours</th><td>{workshop.track}</td></tr>
              )}
              {workshop.estimatedDuration > 0 && (
                <tr><th>Durée estimée</th><td>{workshop.estimatedDuration} min</td></tr>
              )}
              {workshop.maxConcurrentParticipants > 0 && (
                <tr><th>Participants max</th><td>{workshop.maxConcurrentParticipants}</td></tr>
              )}
              {workshop.date && (
                <tr><th>Date</th><td>{new Date(workshop.date).toLocaleDateString('fr-CH')}</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {workshop.prerequisites?.length > 0 && (
          <section className="detail-section">
            <h2>Prérequis</h2>
            <ul>{workshop.prerequisites.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </section>
        )}

        {workshop.requiredMaterials?.length > 0 && (
          <section className="detail-section">
            <h2>Matériel nécessaire</h2>
            <ul>{workshop.requiredMaterials.map((m, i) => <li key={i}>{m}</li>)}</ul>
          </section>
        )}

        {workshop.contentFr && (
          <section className="detail-section detail-content">
            <ReactMarkdown>{workshop.contentFr}</ReactMarkdown>
          </section>
        )}

        {workshop.questions?.length > 0 && (() => {
          const grouped = workshop.questions.reduce<Record<string, Question[]>>((acc, q) => {
            (acc[q.chapterTitle] ??= []).push(q)
            return acc
          }, {})
          return (
            <section className="detail-section">
              <h2>Auto-évaluation</h2>
              {Object.entries(grouped).map(([chapter, qs]) => (
                <div key={chapter} className="questions-group">
                  <h3 className="questions-chapter">{chapter}</h3>
                  {qs.map((q, i) => (
                    <QuestionCard key={i} question={q} index={i} />
                  ))}
                </div>
              ))}
            </section>
          )
        })()}

        {workshop.expectedOutcome && (
          <section className="detail-section">
            <h2>Résultat attendu</h2>
            <p>{workshop.expectedOutcome}</p>
          </section>
        )}
      </article>

      <div className="detail-actions no-print">
        <button className="print-btn" onClick={() => window.print()}>
          Imprimer / Exporter PDF
        </button>
      </div>
    </main>
  )
}
