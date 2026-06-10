import { useState } from 'react'
import { parseCompanionError } from '../utils/companionError'
import './DockerLaunchButton.css'

// Same-origin proxy (Vite dev / nginx) → Companion App on the host (:37428).
const COMPANION_URL = import.meta.env.VITE_COMPANION_URL ?? '/companion'

type Phase =
  | 'idle'
  | 'checking'
  | 'no-companion'
  | 'pulling'
  | 'starting'
  | 'ready'
  | 'error'

interface WorkspaceFile {
  name: string
  content?: string
  gitUrl?: string
}

interface ExerciseRuntime {
  compose: string
  devService: string
  workspaceFiles: WorkspaceFile[]
}

interface Props {
  workshopId: string
  exerciseRuntime: ExerciseRuntime
}

const PHASE_LABELS: Record<Phase, string> = {
  idle:         'Lancer l\'exercice',
  checking:     'Vérification de la Companion App…',
  'no-companion': '',
  pulling:      'Démarrage de la stack Docker…',
  starting:     'Préparation de l\'espace de travail…',
  ready:        'VS Code ouvert',
  error:        'Erreur',
}

export default function DockerLaunchButton({ workshopId, exerciseRuntime }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pullMessage, setPullMessage] = useState<string | null>(null)
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false)

  async function checkCompanion(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(`${COMPANION_URL}/health`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const health = await response.json() as { status?: string }
      if (health.status !== 'ok') throw new Error('invalid health response')
      return true
    } catch {
      return false
    }
  }

  async function runLaunchStream(): Promise<void> {
    setPhase('pulling')

    try {
      const response = await fetch(`${COMPANION_URL}/containers/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          compose:          exerciseRuntime.compose,
          devService:       exerciseRuntime.devService,
          workspaceFiles:   exerciseRuntime.workspaceFiles,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(parseCompanionError(text) || `HTTP ${response.status}`)
      }

      // Read SSE-style stream from companion app
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finished = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.split('\n').find(l => l.startsWith('data: '))
          if (!line) continue
          try {
            const event = JSON.parse(line.slice(6)) as {
              phase: Phase
              message?: string
            }
            setPhase(event.phase)
            if (event.phase === 'pulling' && event.message) {
              setPullMessage(event.message)
            }
            if (event.phase === 'error') {
              setErrorMessage(event.message ?? 'Erreur inconnue')
              return
            }
            if (event.phase === 'ready') {
              setPhase('ready')
              finished = true
              return
            }
          } catch {
            // malformed event — skip
          }
        }
      }

      if (!finished) {
        setPhase('error')
        setErrorMessage(
          'Le companion a fermé la connexion sans terminer le lancement. ' +
          'Redémarrez la Companion App (icône dans la barre des tâches), puis réessayez.',
        )
      }
    } catch (err) {
      setPhase('error')
      setErrorMessage(err instanceof Error ? err.message : String(err))
    }
  }

  async function launch() {
    setPhase('checking')
    setErrorMessage(null)
    setPullMessage(null)

    if (!(await checkCompanion())) {
      setPhase('no-companion')
      return
    }

    await runLaunchStream()
  }

  function requestRestart() {
    setRestartConfirmOpen(true)
  }

  async function confirmRestart() {
    setRestartConfirmOpen(false)
    setPhase('checking')
    setErrorMessage(null)
    setPullMessage(null)

    if (!(await checkCompanion())) {
      setPhase('no-companion')
      return
    }

    try {
      const response = await fetch(`${COMPANION_URL}/containers/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(parseCompanionError(text) || `HTTP ${response.status}`)
      }

    } catch (err) {
      setPhase('error')
      setErrorMessage(err instanceof Error ? err.message : String(err))
      return
    }

    await runLaunchStream()
  }

  function reset() {
    setPhase('idle')
    setErrorMessage(null)
    setPullMessage(null)
  }

  const isRunning = phase === 'checking' || phase === 'pulling' || phase === 'starting'
  const showActionButton = phase !== 'no-companion' && phase !== 'error'

  function statusMessage(): string | null {
    if (phase === 'checking') return PHASE_LABELS.checking
    if (phase === 'pulling') return pullMessage ?? PHASE_LABELS.pulling
    if (phase === 'starting') return PHASE_LABELS.starting
    return null
  }

  return (
    <section className="docker-launch" data-testid="docker-environment">
      <div className="docker-launch-header">
        <span className="docker-launch-icon" aria-hidden="true">🐳</span>
        <div>
          <h2 className="docker-launch-title">Environnement de l'exercice</h2>
          <code className="docker-launch-image" data-testid="docker-dev-service">
            Service : {exerciseRuntime.devService}
          </code>
        </div>
      </div>

      {exerciseRuntime.workspaceFiles?.length > 0 && (
        <p className="docker-launch-meta">
          Fichiers fournis :&nbsp;
          {exerciseRuntime.workspaceFiles.map(f => (
            <code key={f.name} className="docker-file-chip">{f.name}</code>
          ))}
        </p>
      )}

      <div className="docker-launch-action">
        {phase === 'no-companion' && (
          <div className="docker-launch-alert">
            <strong>Companion App introuvable.</strong>
            <p>
              Téléchargez et lancez la Companion App ORIF, puis réessayez.
              Elle doit tourner en arrière-plan avant de cliquer sur ce bouton.
            </p>
            <button className="docker-btn docker-btn-secondary" onClick={reset}>
              Réessayer
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="docker-launch-alert docker-launch-alert--error">
            <strong>Erreur</strong>
            {errorMessage && <p>{errorMessage}</p>}
            <button className="docker-btn docker-btn-secondary" onClick={reset}>
              Réessayer
            </button>
          </div>
        )}

        {isRunning && statusMessage() && (
          <p className="docker-launch-status">{statusMessage()}</p>
        )}

        {phase === 'ready' && (
          <div className="docker-launch-ready-status">
            <span className="docker-ready-icon">✓</span>
            VS Code ouvert dans le container — bonne session !
          </div>
        )}

        {showActionButton && (
          <button
            className="docker-btn docker-btn-primary"
            onClick={phase === 'ready' ? requestRestart : launch}
            disabled={isRunning}
          >
            {isRunning && <span className="docker-spinner" aria-hidden="true" />}
            {phase === 'ready' ? 'Recommencer l\'exercice' : PHASE_LABELS[phase]}
          </button>
        )}
      </div>

      {restartConfirmOpen && (
        <div className="docker-restart-overlay" role="presentation" onClick={() => setRestartConfirmOpen(false)}>
          <div
            className="docker-restart-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="docker-restart-title"
            data-testid="restart-confirm-dialog"
            onClick={e => e.stopPropagation()}
          >
            <h3 id="docker-restart-title" className="docker-restart-title">
              Réinitialiser l'exercice ?
            </h3>
            <p className="docker-restart-text">
              Tous vos fichiers locaux seront supprimés et l'environnement sera recréé depuis zéro.
            </p>
            <p className="docker-restart-text">
              La Companion App fermera automatiquement VS Code ou Cursor s'il est ouvert sur cet
              exercice. Si l'éditeur reste ouvert, fermez-le manuellement avant de continuer.
            </p>
            <div className="docker-restart-actions">
              <button
                type="button"
                className="docker-btn docker-btn-secondary"
                data-testid="restart-confirm-cancel"
                onClick={() => setRestartConfirmOpen(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="docker-btn docker-btn-danger"
                data-testid="restart-confirm-submit"
                onClick={confirmRestart}
              >
                Réinitialiser et relancer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
