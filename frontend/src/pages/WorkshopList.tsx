import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './WorkshopList.css'

interface Workshop {
  id: string
  title: string
  description: string
  type: 'Theory' | 'Exercise' | number
  level: 'Introduction' | 'Advanced' | number
}

const TYPE_LABELS: Record<number, string> = { 0: 'Theory', 1: 'Exercise' }
const LEVEL_LABELS: Record<number, string> = { 0: 'Introduction', 1: 'Advanced' }

function typeLabel(v: Workshop['type']): string {
  return typeof v === 'number' ? TYPE_LABELS[v] ?? String(v) : v
}
function levelLabel(v: Workshop['level']): string {
  return typeof v === 'number' ? LEVEL_LABELS[v] ?? String(v) : v
}

export default function WorkshopList() {
  const profile = localStorage.getItem('profile') ?? 'apprentice'
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/workshops?profile=${profile}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<Workshop[]>
      })
      .then(setWorkshops)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [profile])

  if (loading) return <main className="workshop-list-page"><p>Chargement…</p></main>
  if (error) return <main className="workshop-list-page"><p className="error">Erreur : {error}</p></main>

  return (
    <main className="workshop-list-page">
      <header className="list-header">
        <h1>Ateliers</h1>
        <Link to="/profile" className="change-profile">Changer de profil</Link>
      </header>
      <ul className="workshop-list" data-testid="workshop-list">
        {workshops.map((w) => (
          <li key={w.id} data-testid="workshop-item" className="workshop-card">
            <div className="workshop-badges">
              <span data-testid="workshop-type" className={`badge type-${typeLabel(w.type).toLowerCase()}`}>
                {typeLabel(w.type)}
              </span>
              <span data-testid="workshop-level" className={`badge level-${levelLabel(w.level).toLowerCase()}`}>
                {levelLabel(w.level)}
              </span>
            </div>
            <Link to={`/workshops/${w.id}`} className="workshop-title">{w.title}</Link>
            {w.description && <p className="workshop-description">{w.description}</p>}
          </li>
        ))}
      </ul>
    </main>
  )
}
